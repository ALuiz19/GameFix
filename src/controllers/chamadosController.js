const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll } = require('../config/database');
const { publicarEvento } = require('../models/eventoModel');

function criarChamado(req, res) {
  const { cliente_id, aparelho, modelo, descricao_defeito } = req.body;
  if (!cliente_id || !aparelho || !modelo || !descricao_defeito)
    return res.status(400).json({ erro: 'Campos obrigatórios: cliente_id, aparelho, modelo, descricao_defeito.' });
  const cliente = dbGet("SELECT * FROM usuarios WHERE id = ? AND tipo = 'cliente'", [cliente_id]);
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });
  const id = uuidv4();
  dbRun('INSERT INTO chamados (id, cliente_id, aparelho, modelo, descricao_defeito) VALUES (?,?,?,?,?)',
    [id, cliente_id, aparelho, modelo, descricao_defeito]);
  const chamado = dbGet('SELECT * FROM chamados WHERE id = ?', [id]);
  publicarEvento('chamado.criado', id, { chamado_id: id, cliente_id, aparelho, modelo });
  return res.status(201).json(chamado);
}

function listarChamados(req, res) {
  const { status, cliente_id, tecnico_id } = req.query;
  let sql = 'SELECT * FROM chamados WHERE 1=1'; const p = [];
  if (status)     { sql += ' AND status = ?';     p.push(status); }
  if (cliente_id) { sql += ' AND cliente_id = ?'; p.push(cliente_id); }
  if (tecnico_id) { sql += ' AND tecnico_id = ?'; p.push(tecnico_id); }
  sql += ' ORDER BY criado_em DESC';
  return res.json(dbAll(sql, p));
}

function buscarChamado(req, res) {
  const c = dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ erro: 'Chamado não encontrado.' });
  return res.json(c);
}

function aceitarChamado(req, res) {
  const { tecnico_id } = req.body;
  if (!tecnico_id) return res.status(400).json({ erro: 'tecnico_id é obrigatório.' });
  const c = dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ erro: 'Chamado não encontrado.' });
  if (c.status !== 'aberto') return res.status(409).json({ erro: `Status inválido: "${c.status}".` });
  const t = dbGet("SELECT * FROM usuarios WHERE id = ? AND tipo = 'tecnico'", [tecnico_id]);
  if (!t) return res.status(404).json({ erro: 'Técnico não encontrado.' });
  dbRun("UPDATE chamados SET status='aceito', tecnico_id=?, atualizado_em=datetime('now') WHERE id=?", [tecnico_id, req.params.id]);
  publicarEvento('chamado.aceito', req.params.id, { chamado_id: req.params.id, tecnico_id });
  return res.json(dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]));
}

function recusarChamado(req, res) {
  const { tecnico_id } = req.body;
  if (!tecnico_id) return res.status(400).json({ erro: 'tecnico_id é obrigatório.' });
  const c = dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ erro: 'Chamado não encontrado.' });
  if (c.status !== 'aberto') return res.status(409).json({ erro: `Status inválido: "${c.status}".` });
  dbRun("UPDATE chamados SET status='recusado_tecnico', atualizado_em=datetime('now') WHERE id=?", [req.params.id]);
  publicarEvento('chamado.recusado', req.params.id, { chamado_id: req.params.id, tecnico_id });
  return res.json(dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]));
}

function concluirChamado(req, res) {
  const { resultado } = req.body;
  if (!resultado || !['consertado','nao_consertado'].includes(resultado))
    return res.status(400).json({ erro: 'resultado deve ser "consertado" ou "nao_consertado".' });
  const c = dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ erro: 'Chamado não encontrado.' });
  if (c.status !== 'aprovado') return res.status(409).json({ erro: `Status inválido: "${c.status}".` });
  const novoStatus = resultado === 'consertado' ? 'concluido' : 'nao_concluido';
  dbRun("UPDATE chamados SET status=?, atualizado_em=datetime('now') WHERE id=?", [novoStatus, req.params.id]);
  publicarEvento('chamado.concluido', req.params.id, { chamado_id: req.params.id, resultado });
  return res.json(dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]));
}

module.exports = { criarChamado, listarChamados, buscarChamado, aceitarChamado, recusarChamado, concluirChamado };
