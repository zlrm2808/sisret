import type { APIRoute } from 'astro';
import { db } from '@/services/db';

export const GET: APIRoute = async ({ cookies, url }) => {
  const session = cookies.get('session');
  // userRif and userId are no longer needed for filtering all retentions
  // const userRif = cookies.get('user_rif')?.value;
  // const userId = parseInt(cookies.get('user_id')?.value || '0');

  if (!session) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }

  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '15');
  const searchTerm = url.searchParams.get('searchTerm') || '';
  const typeFilter = url.searchParams.get('typeFilter') || 'all'; // 'all', 'ISLR', 'IVA'
  const sortColumn = url.searchParams.get('sortColumn') || 'fecha_documento';
  const sortDirection = url.searchParams.get('sortDirection') || 'desc';

  const offset = (page - 1) * limit;

  try {
    let islrData: any[] = [];
    let rivaData: any[] = [];
    let islrTotal = 0;
    let rivaTotal = 0;

    // Determine actual column names for sorting
    const islrSortColumnMap: Record<string, string> = {
      type: 'type',
      rif: 'islr_rif',
      nro_factura: 'islr_nrofac',
      nro_comprobante: 'islr_nroret',
      fecha_documento: 'islr_fecemi',
      base_imponible: 'islr_bimp',
      monto_retenido: 'islr_impret',
    };

    const rivaSortColumnMap: Record<string, string> = {
      type: 'type',
      rif: 'riva_rif',
      nro_factura: 'riva_nrofac',
      nro_comprobante: 'riva_nrocom',
      fecha_documento: 'riva_fecdoc',
      base_imponible: 'riva_bimp',
      monto_retenido: 'riva_iret',
    };

    const actualIslrSortColumn = islrSortColumnMap[sortColumn] || 'islr_fecemi';
    const actualRivaSortColumn = rivaSortColumnMap[sortColumn] || 'riva_fecdoc';

    // Function to build WHERE clause and params for a given table (without userRif filter)
    const buildWhereClause = (fields: string[], prefix: string, term: string) => {
      let clauses: string[] = [];
      let params: any[] = [];

      if (term) {
        const searchPattern = `%${term}%`;
        clauses.push(`(${fields.map(field => `${prefix}${field} LIKE ?`).join(' OR ')})`);
        params.push(...Array(fields.length).fill(searchPattern));
      }
      return { clauses, params };
    };

    // ISLR Query
    if (typeFilter === 'ISLR' || typeFilter === 'all') {
      const islrSearchFields = ['rif', 'nrofac', 'nroret', 'nombre', 'direcc'];
      const { clauses, params } = buildWhereClause(islrSearchFields, 'islr_', searchTerm);

      let islrQuery = `SELECT islr_rif, islr_nrofac, islr_nroret, islr_nroctr, islr_fecemi, islr_bimp, islr_impret, islr_nombre, islr_direcc FROM dp_islr`;
      let islrCountQuery = `SELECT COUNT(*) as count FROM dp_islr`;

      if (clauses.length > 0) {
        islrQuery += ` WHERE ` + clauses.join(' AND ');
        islrCountQuery += ` WHERE ` + clauses.join(' AND ');
      }

      islrQuery += ` ORDER BY ${actualIslrSortColumn} ${sortDirection.toUpperCase()} LIMIT ? OFFSET ?`;

      const [rows] = await db.execute(islrQuery, [...params, limit, offset]);
      islrData = rows as any[];

      const [countResult] = await db.execute(islrCountQuery, params);
      islrTotal = (countResult as any[])[0].count;
    }

    // RIVA Query
    if (typeFilter === 'IVA' || typeFilter === 'all') {
      const rivaSearchFields = ['rif', 'nrocom', 'nrofac', 'nombre', 'direcc'];
      const { clauses, params } = buildWhereClause(rivaSearchFields, 'riva_', searchTerm);

      let rivaQuery = `SELECT riva_rif, riva_nrocom, riva_nrofac, riva_nroctr, riva_fecdoc, riva_bimp, riva_iiva, riva_iret, riva_nombre, riva_direcc FROM dp_riva`;
      let rivaCountQuery = `SELECT COUNT(*) as count FROM dp_riva`;

      if (clauses.length > 0) {
        rivaQuery += ` WHERE ` + clauses.join(' AND ');
        rivaCountQuery += ` WHERE ` + clauses.join(' AND ');
      }

      rivaQuery += ` ORDER BY ${actualRivaSortColumn} ${sortDirection.toUpperCase()} LIMIT ? OFFSET ?`;

      const [rows] = await db.execute(rivaQuery, [...params, limit, offset]);
      rivaData = rows as any[];

      const [countResult] = await db.execute(rivaCountQuery, params);
      rivaTotal = (countResult as any[])[0].count;
    }

    const combinedData = [
      ...islrData.map(row => ({
        type: 'ISLR',
        rif: row.islr_rif,
        nro_factura: row.islr_nrofac,
        nro_comprobante: row.islr_nroret,
        nro_control: row.islr_nroctr,
        fecha_documento: row.islr_fecemi,
        base_imponible: parseFloat(row.islr_bimp),
        monto_retenido: parseFloat(row.islr_impret),
        original_islr_rif: row.islr_rif,
        original_islr_nrofac: row.islr_nrofac,
        original_islr_nroret: row.islr_nroret,
      })),
      ...rivaData.map(row => ({
        type: 'IVA',
        rif: row.riva_rif,
        nro_factura: row.riva_nrofac,
        nro_comprobante: row.riva_nrocom,
        nro_control: row.riva_nroctr,
        fecha_documento: row.riva_fecdoc,
        base_imponible: parseFloat(row.riva_bimp),
        monto_iva: parseFloat(row.riva_iiva),
        monto_retenido: parseFloat(row.riva_iret),
        original_riva_rif: row.riva_rif,
        original_riva_nrocom: row.riva_nrocom,
        original_riva_nrofac: row.riva_nrofac,
      })),
    ];

    const totalCount = islrTotal + rivaTotal;

    return new Response(JSON.stringify({
      data: combinedData,
      total: totalCount,
    }));

  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ message: 'Internal server error' }),
      { status: 500 }
    );
  }
};
