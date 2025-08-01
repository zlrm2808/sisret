import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host: import.meta.env.DB_HOST,
  user: import.meta.env.DB_USER,
  password: import.meta.env.DB_PASSWORD,
  port: Number(import.meta.env.DB_PORT),
  database: import.meta.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
