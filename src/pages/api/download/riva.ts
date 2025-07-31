import type { APIRoute } from 'astro';
import { db } from '@/services/db';

export const GET: APIRoute = async ({ cookies }) => {
  const session = cookies.get('session');

  if (!session) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }

  try {
    const [rows] = await db.execute('SELECT riva_rif, riva_nrocom, riva_nrofac, riva_iret FROM dp_riva');
    const rivaData = rows as any[];

    if (rivaData.length === 0) {
      return new Response('No RIVA data found.', { status: 404 });
    }

    const headers = Object.keys(rivaData[0]).join(',');
    const csv = rivaData.map(row => Object.values(row).join(',')).join('\n');

    return new Response(`${headers}\n${csv}`, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="retenciones_riva.csv"',
      },
    });

  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ message: 'Internal server error' }),
      { status: 500 }
    );
  }
};
