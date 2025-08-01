import type { APIRoute } from 'astro';
import { db } from '@/services/db';
import handlebars from 'handlebars';
import htmlPdf from 'html-pdf';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const GET: APIRoute = async ({ cookies, url }) => {
  const session = cookies.get('session');

  if (!session) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }

  const islr_rif = url.searchParams.get('islr_rif');
  const islr_nrofac = url.searchParams.get('islr_nrofac');
  const islr_nroret = url.searchParams.get('islr_nroret');

  if (!islr_rif || !islr_nrofac || !islr_nroret) {
    return new Response(JSON.stringify({ message: 'Missing ISLR parameters' }), { status: 400 });
  }

  try {
    const [rows] = await db.execute(
      'SELECT islr_rif, islr_nrofac, islr_nroret, islr_nroctr, islr_fecemi, islr_bimp, islr_impret, islr_nombre FROM dp_islr WHERE islr_rif = ? AND islr_nrofac = ? AND islr_nroret = ?',
      [islr_rif, islr_nrofac, islr_nroret]
    );
    const islrData = rows as any[];

    if (islrData.length === 0) {
      return new Response('ISLR data not found.', { status: 404 });
    }

    const data = islrData[0];

    // Mock data for agent and subject. Replace with actual data from your DB if available.
    const agentData = {
      agente_rif: 'J-00000000-0',
      agente_razon_social: 'Mi Empresa C.A.',
      agente_direccion: 'Av. Principal, Edif. X, Piso Y, Caracas',
    };

    const subjectData = {
      sujeto_razon_social: 'Sujeto Retenido S.A.',
    };

    const templatePath = path.resolve(__dirname, '../../../templates/islr-template.html');
    const templateHtml = readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateHtml);

    const html = template({
      ...data,
      ...agentData,
      sujeto_razon_social: data.islr_nombre,
      fecha: new Date().toLocaleDateString('es-VE'),
      islr_fechafac: new Date(data.islr_fecemi).toLocaleDateString('es-VE'),
      islr_monto: data.islr_bimp, // Monto Factura
      islr_monto_retenido: data.islr_impret, // Monto Retenido
    });

    console.log(html);

    return new Promise((resolve, reject) => {
      htmlPdf.create(html, { base: `file://${templatePath}` }).toBuffer((err, buffer) => {
        if (err) {
          console.error(err);
          return reject(new Response(JSON.stringify({ message: 'Error generating PDF' }), { status: 500 }));
        }

        resolve(new Response(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="comprobante_islr_${data.islr_nroret}.pdf"`,
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
