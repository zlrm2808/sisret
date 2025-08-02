import type { APIRoute } from 'astro';
import { db } from '@/services/db';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  const username = data.get('username') as string;
  const rif = data.get('rif') as string;
  const password = data.get('password') as string;

  if (!username || !rif || !password) {
    return new Response(
      JSON.stringify({ message: 'Username, RIF, and password are required' }),
      { status: 400 }
    );
  }

  try {
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE username = ? OR rif = ?', [username, rif]);
    const users = rows as any[];

    if (users.length > 0) {
      return new Response(
        JSON.stringify({ message: 'User already exists or RIF is already registered' }),
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      'INSERT INTO usuarios (username, rif, password) VALUES (?, ?, ?)',
      [username, rif, hashedPassword]
    );

    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/login',
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
