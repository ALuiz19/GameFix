const jwt = require('jsonwebtoken');
const { dbGet } = require('../config/database');
const { autenticarUsuarioPorEmailSenha, sanitizeUsuario } = require('./usuariosController');

function criarToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, tipo: usuario.tipo, email: usuario.email },
    process.env.JWT_SECRET || 'gamefix-dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function login(req, res) {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Campos obrigatórios: email, senha.' });

  const usuario = autenticarUsuarioPorEmailSenha(email, senha);
  if (!usuario) return res.status(401).json({ erro: 'Credenciais inválidas.' });

  return res.json({ token: criarToken(usuario), usuario });
}

function me(req, res) {
  const usuario = dbGet('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  return res.json({ usuario: sanitizeUsuario(usuario) });
}

module.exports = { login, me, criarToken };