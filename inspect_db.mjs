import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connectionConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT)
};

async function inspectDb() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('Successfully connected to the database.');

    const [riva_columns] = await connection.execute('DESCRIBE dp_riva');
    console.log('\nColumns in `dp_riva` table:');
    console.table(riva_columns);

  } catch (error) {
    console.error('Error connecting to the database or fetching schema:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nConnection closed.');
    }
  }
}

inspectDb();
