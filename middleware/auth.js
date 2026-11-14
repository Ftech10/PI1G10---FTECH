const jwt = require('jsonwebtoken');
const db = require('../db');
module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer '))
    return res.status(401).json({ message: 'Acesso não autorizado.' });
  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }
  const [[user]] = await db.query(
    'SELECT id,perfil,ativo,session_version FROM usuarios WHERE id=?',
    [payload.id]
  );
  if (!user || !user.ativo || payload.version !== user.session_version)
    return res.status(401).json({ message: 'Sessão encerrada. Entre novamente.' });
  req.user = { id: user.id, role: user.perfil };
  next();
};
