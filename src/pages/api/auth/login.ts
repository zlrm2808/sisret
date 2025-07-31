import type { APIRoute } from 'astro';
import { db } from '@/services/db';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request, cookies }) => {
  const data = await request.formData();
  const username = data.get('username') as string;
  const password = data.get('password') as string;

  if (!username || !password) {
    return new Response(
      JSON.stringify({ message: 'Username and password are required' }),
      { status: 400 }
    );
  }

  try {
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE username = ?', [username]);
    const users = rows as any[];

    if (users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Invalid credentials' }),
        { status: 401 }
      );
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return new Response(
        JSON.stringify({ message: 'Invalid credentials' }),
        { status: 401 }
      );
    }

    const sessionId = crypto.randomUUID();
    cookies.set('session', sessionId, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    cookies.set('user_rif', user.rif, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: '/dashboard',
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
