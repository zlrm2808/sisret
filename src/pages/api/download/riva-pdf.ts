import type { APIRoute } from 'astro';
import { db } from '@/services/db';
import handlebars from 'handlebars';
import htmlPdf from 'html-pdf';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const GET: APIRoute = async ({ cookies, request }) => {
  const session = cookies.get('session');

  if (!session) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }

  const url = new URL(request.url);
  const riva_rif = url.searchParams.get('riva_rif');
  const riva_nrocom = url.searchParams.get('riva_nrocom');
  const riva_nrofac = url.searchParams.get('riva_nrofac');

  if (!riva_rif || !riva_nrocom || !riva_nrofac) {
    return new Response(JSON.stringify({ message: 'Missing RIVA parameters' }), { status: 400 });
  }

  try {
    const [rows] = await db.execute(
      'SELECT riva_rif, riva_nrocom, riva_nrofac, riva_nroctr, riva_fecdoc, riva_bimp, riva_iiva, riva_iret FROM dp_riva WHERE riva_rif = ? AND riva_nrocom = ? AND riva_nrofac = ?',
      [riva_rif, riva_nrocom, riva_nrofac]
    );
    const rivaData = rows as any[];

    if (rivaData.length === 0) {
      return new Response('RIVA data not found.', { status: 404 });
    }

    const data = rivaData[0];

    // Mock data for agent and subject. Replace with actual data from your DB if available.
    const agentData = {
      agente_rif: 'J-00000000-0',
      agente_razon_social: 'Mi Empresa C.A.',
      agente_direccion: 'Av. Principal, Edif. X, Piso Y, Caracas',
    };

    const subjectData = {
      sujeto_razon_social: 'Sujeto Retenido S.A.',
    };

    const templatePath = path.resolve(__dirname, '../../templates/riva-template.html');
    const templateHtml = readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateHtml);

    const html = template({
      ...data,
      ...agentData,
      ...subjectData,
      fecha: new Date().toLocaleDateString('es-VE'),
      riva_fechafac: new Date(data.riva_fecdoc).toLocaleDateString('es-VE'),
      riva_baseimp: data.riva_bimp,
      riva_montoiva: data.riva_iiva,
      riva_monto: data.riva_iret,
    });

    return new Promise((resolve, reject) => {
      htmlPdf.create(html).toBuffer((err, buffer) => {
        if (err) {
          console.error(err);
          return reject(new Response(JSON.stringify({ message: 'Error generating PDF' }), { status: 500 }));
        }

        resolve(new Response(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="comprobante_riva_${data.riva_nrocom}.pdf"`,
          },
        }));
      });
    });

  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ message: 'Internal server error' }),
      { status: 500 }
    );
  }
};
