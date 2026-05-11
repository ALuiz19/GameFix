const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet } = require('../config/database');
const { publicarEvento } = require('../models/eventoModel');

function enviarOrcamento(req, res) {
  const { valor, descricao } = req.body;
  if (!valor || isNaN(Number(valor)) || Number(valor) <= 0)
    return res.status(400).json({ erro: 'valor deve ser um número positivo.' });
  const c = dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ erro: 'Chamado não encontrado.' });
  if (c.status !== 'aceito') return res.status(409).json({ erro: 'Chamado não está com status "aceito".' });
  const id = uuidv4();
  dbRun('INSERT INTO orcamentos (id, chamado_id, valor, descricao) VALUES (?,?,?,?)',
    [id, req.params.id, Number(valor), descricao||null]);
  dbRun("UPDATE chamados SET status='aguardando_aprovacao', atualizado_em=datetime('now') WHERE id=?", [req.params.id]);
  publicarEvento('orcamento.enviado', req.params.id, { chamado_id: req.params.id, orcamento_id: id, valor });
  return res.status(201).json(dbGet('SELECT * FROM orcamentos WHERE id = ?', [id]));
}

function buscarOrcamento(req, res) {
  const o = dbGet('SELECT * FROM orcamentos WHERE chamado_id = ? ORDER BY criado_em DESC', [req.params.id]);
  if (!o) return res.status(404).json({ erro: 'Orçamento não encontrado.' });
  return res.json(o);
}

function responderOrcamento(req, res) {
  const { decisao } = req.body;
  if (!decisao || !['aprovado','recusado'].includes(decisao))
    return res.status(400).json({ erro: 'decisao deve ser "aprovado" ou "recusado".' });
  const c = dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ erro: 'Chamado não encontrado.' });
  if (c.status !== 'aguardando_aprovacao') return res.status(409).json({ erro: 'Chamado não aguarda aprovação.' });
  const o = dbGet('SELECT * FROM orcamentos WHERE chamado_id = ? ORDER BY criado_em DESC', [req.params.id]);
  if (!o) return res.status(404).json({ erro: 'Orçamento não encontrado.' });
  dbRun('UPDATE orcamentos SET status = ? WHERE id = ?', [decisao, o.id]);
  const novoStatus = decisao === 'aprovado' ? 'aprovado' : 'recusado_cliente';
  dbRun("UPDATE chamados SET status=?, atualizado_em=datetime('now') WHERE id=?", [novoStatus, req.params.id]);
  const evento = decisao === 'aprovado' ? 'orcamento.aprovado' : 'orcamento.recusado';
  publicarEvento(evento, req.params.id, { chamado_id: req.params.id, decisao });
  return res.json({ mensagem: `Orçamento ${decisao}.`, chamado_id: req.params.id, decisao });
}

module.exports = { enviarOrcamento, buscarOrcamento, responderOrcamento };
