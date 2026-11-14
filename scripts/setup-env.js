const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const target = path.join(__dirname, '../.env');
if (fs.existsSync(target)) {
  console.log('O .env já existe e foi preservado. Confira DB_* e JWT_SECRET antes de iniciar.');
} else {
  const template = fs
    .readFileSync(path.join(__dirname, '../.env.example'), 'utf8')
    .replace(/^JWT_SECRET=$/m, 'JWT_SECRET=' + crypto.randomBytes(48).toString('hex'))
    .replace(/^DEMO_PASSWORD=$/m, 'DEMO_PASSWORD=' + crypto.randomBytes(12).toString('base64url'));
  fs.writeFileSync(target, template, { flag: 'wx', mode: 0o600 });
  console.log(
    '.env criado com chaves aleatórias. Configure as credenciais DB_* do seu MySQL. A senha das contas novas de demonstração está em DEMO_PASSWORD.'
  );
}
