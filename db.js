const mysql = require('mysql2/promise');
const zone = process.env.DB_TIMEZONE || '-03:00';
if (!/^[+-](?:0\d|1[0-3]):[0-5]\d$/.test(zone))
  throw new Error('DB_TIMEZONE deve usar o formato -03:00.');
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fithtech',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: zone,
  dateStrings: ['DATE'],
});
pool.on('connection', (connection) => connection.query('SET time_zone=?', [zone]));
module.exports = pool;
