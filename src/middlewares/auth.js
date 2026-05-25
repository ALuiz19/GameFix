const jwt = require('jsonwebtoken');
const { dbGet } = require('../config/database');
const { sanitizeUsuario } = require('../controllers/usuariosController');

function extrairToken(authorization) {
  if (!authorization) return null;
  const [tipo, token] = authorization.split(' ');
  if (tipo !== 'Bearer' || !token) return null;
  return token;
}

function requireAuth(req, res, next) {
  const token = extrairToken(req.headers.authorization);
  if (!token) return res.status(401).json({ erro: 'Token de autenticação ausente.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'gamefix-dev-secret');
    const usuario = dbGet('SELECT * FROM usuarios WHERE id = ?', [payload.sub]);
    if (!usuario) return res.status(401).json({ erro: 'Usuário do token não encontrado.' });
    req.user = sanitizeUsuario(usuario);
    return next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ erro: 'Autenticação obrigatória.' });
    if (!roles.includes(req.user.tipo)) return res.status(403).json({ erro: 'Acesso negado para este perfil.' });
    return next();
  };
}

module.exports = { requireAuth, requireRole };