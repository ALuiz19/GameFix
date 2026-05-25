const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { dbRun, dbGet, dbAll } = require('../config/database');

function sanitizeUsuario(usuario) {
  if (!usuario) return null;
  const { senha_hash, ...restante } = usuario;
  return restante;
}

function criarUsuario(req, res) {
  const { nome, email, telefone, tipo, senha } = req.body;
  if (!nome || !email || !tipo || !senha) return res.status(400).json({ erro: 'Campos obrigatórios: nome, email, tipo, senha.' });
  if (String(senha).length < 6) return res.status(400).json({ erro: 'senha deve ter no mínimo 6 caracteres.' });
  if (!['cliente', 'tecnico'].includes(tipo)) return res.status(400).json({ erro: 'tipo deve ser "cliente" ou "tecnico".' });
  const id = uuidv4();
  try {
    const senhaHash = bcrypt.hashSync(String(senha), 10);
    dbRun('INSERT INTO usuarios (id, nome, email, telefone, tipo, senha_hash) VALUES (?,?,?,?,?,?)', [id, nome, email, telefone || null, tipo, senhaHash]);
    return res.status(201).json(sanitizeUsuario(dbGet('SELECT * FROM usuarios WHERE id = ?', [id])));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    console.error('[usuarios] erro ao criar usuário:', err.message);
    return res.status(500).json({ erro: 'Erro interno ao criar usuário.' });
  }
}

function buscarUsuario(req, res) {
  const u = dbGet('SELECT * FROM usuarios WHERE id = ?', [req.params.id]);
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  return res.json(sanitizeUsuario(u));
}

function listarUsuarios(req, res) {
  const { tipo } = req.query;
  if (tipo) return res.json(dbAll('SELECT * FROM usuarios WHERE tipo = ? ORDER BY criado_em DESC', [tipo]).map(sanitizeUsuario));
  return res.json(dbAll('SELECT * FROM usuarios ORDER BY criado_em DESC').map(sanitizeUsuario));
}

function autenticarUsuarioPorEmailSenha(email, senha) {
  const usuario = dbGet('SELECT * FROM usuarios WHERE email = ?', [email]);
  if (!usuario || !usuario.senha_hash) return null;
  if (!bcrypt.compareSync(String(senha), usuario.senha_hash)) return null;
  return sanitizeUsuario(usuario);
}

module.exports = { criarUsuario, buscarUsuario, listarUsuarios, autenticarUsuarioPorEmailSenha, sanitizeUsuario };
