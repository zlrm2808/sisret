import type { APIRoute } from 'astro';
import { db } from '@/services/db';

export const GET: APIRoute = async ({ cookies }) => {
  const session = cookies.get('session');

  if (!session) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }

  try {
    const [rows] = await db.execute('SELECT islr_rif, islr_nrofac, islr_nroret, islr_bimp FROM dp_islr');
    const islrData = rows as any[];

    if (islrData.length === 0) {
      return new Response('No ISLR data found.', { status: 404 });
    }

    const headers = Object.keys(islrData[0]).join(',');
    const csv = islrData.map(row => Object.values(row).join(',')).join('\n');

    return new Response(`${headers}\n${csv}`, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="retenciones_islr.csv"',
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
