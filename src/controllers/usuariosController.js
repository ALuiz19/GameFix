const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll } = require('../config/database');

function criarUsuario(req, res) {
  const { nome, email, telefone, tipo } = req.body;
  if (!nome || !email || !tipo) return res.status(400).json({ erro: 'Campos obrigatórios: nome, email, tipo.' });
  if (!['cliente', 'tecnico'].includes(tipo)) return res.status(400).json({ erro: 'tipo deve ser "cliente" ou "tecnico".' });
  const id = uuidv4();
  try {
    dbRun('INSERT INTO usuarios (id, nome, email, telefone, tipo) VALUES (?,?,?,?,?)', [id, nome, email, telefone||null, tipo]);
    return res.status(201).json(dbGet('SELECT * FROM usuarios WHERE id = ?', [id]));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    return res.status(500).json({ erro: err.message });
  }
}

function buscarUsuario(req, res) {
  const u = dbGet('SELECT * FROM usuarios WHERE id = ?', [req.params.id]);
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  return res.json(u);
}

function listarUsuarios(req, res) {
  const { tipo } = req.query;
  if (tipo) return res.json(dbAll('SELECT * FROM usuarios WHERE tipo = ? ORDER BY criado_em DESC', [tipo]));
  return res.json(dbAll('SELECT * FROM usuarios ORDER BY criado_em DESC'));
}

module.exports = { criarUsuario, buscarUsuario, listarUsuarios };
