import mysql from 'mysql2/promise';
import "dotenv/config";

let connection = null;
const isMockMode = process.env.USE_MOCK === "true";

export async function connectMySQL() {

  // SAD PATH: Environment flag explicitly tells us to use mock
  if (isMockMode) {
    console.log("⚡using mock data,Bypassing Mysql connection.");
    return null;
  }

  if (connection) {
    return connection;
  }

  connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '@233Breakaleg',
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
