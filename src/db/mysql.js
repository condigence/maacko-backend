import mysql from 'mysql2/promise';

let connection = null;

export async function connectMySQL() {
  if (connection) {
    return connection;
  }

  connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || 'maako',
  });

  await connection.query('SELECT 1');
  console.log('MySQL connected successfully');
  return connection;
}

export async function disconnectMySQL() {
  if (connection) {
    await connection.end();
    connection = null;
  }
}
