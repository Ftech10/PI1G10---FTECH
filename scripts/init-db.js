require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
(async () => {
  let c;
  try {
    const database = process.env.DB_NAME || 'fithtech';
    if (!/^[a-zA-Z0-9_]+$/.test(database))
      throw new Error('DB_NAME deve conter apenas letras, números e sublinhado.');
    c = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });
    const schema = fs
      .readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8')
      .replaceAll('fithtech', database);
    await c.query(schema);
    console.log(
      'Banco FTECH preparado. Para banco existente execute npm run migrate. Dados de demonstração: npm run seed:demo.'
    );
  } catch (e) {
    console.error('Erro ao preparar banco:', e.code || e.message);
    process.exitCode = 1;
  } finally {
    if (c) await c.end();
  }
})();
