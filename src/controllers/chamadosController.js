const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll } = require('../config/database');
const { publicarEvento } = require('../models/eventoModel');

function criarChamado(req, res) {
  const { cliente_id, aparelho, modelo, descricao_defeito } = req.body;
  if (!cliente_id || !aparelho || !modelo || !descricao_defeito)
    return res.status(400).json({ erro: 'Campos obrigatórios: cliente_id, aparelho, modelo, descricao_defeito.' });
  const clienteAutenticado = req.user ? req.user.id : cliente_id;
  if (req.user && cliente_id !== req.user.id) return res.status(403).json({ erro: 'Cliente autenticado não pode usar outro cliente_id.' });
  const cliente = dbGet("SELECT * FROM usuarios WHERE id = ? AND tipo = 'cliente'", [clienteAutenticado]);
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });
  const id = uuidv4();
  dbRun('INSERT INTO chamados (id, cliente_id, aparelho, modelo, descricao_defeito) VALUES (?,?,?,?,?)',
    [id, clienteAutenticado, aparelho, modelo, descricao_defeito]);
  const chamado = dbGet('SELECT * FROM chamados WHERE id = ?', [id]);
  publicarEvento('chamado.criado', id, { chamado_id: id, cliente_id: clienteAutenticado, aparelho, modelo });
  return res.status(201).json(chamado);
}

function listarChamados(req, res) {
  const { status, cliente_id, tecnico_id } = req.query;
  let sql = 'SELECT * FROM chamados WHERE 1=1'; const p = [];
  if (req.user && req.user.tipo === 'cliente') {
    if (cliente_id && cliente_id !== req.user.id) return res.status(403).json({ erro: 'Acesso negado para este cliente.' });
    sql += ' AND cliente_id = ?';
    p.push(req.user.id);
  } else if (req.user && req.user.tipo === 'tecnico' && tecnico_id && tecnico_id !== req.user.id) {
    return res.status(403).json({ erro: 'Acesso negado para este técnico.' });
  }

  if (req.user && req.user.tipo === 'tecnico') {
    sql += ' AND id NOT IN (SELECT chamado_id FROM chamado_recusas WHERE tecnico_id = ?)';
    p.push(req.user.id);
  }

  if (status)     { sql += ' AND status = ?';     p.push(status); }
  if (!req.user || req.user.tipo !== 'cliente') {
    if (cliente_id) { sql += ' AND cliente_id = ?'; p.push(cliente_id); }
  }
  if (tecnico_id) { sql += ' AND tecnico_id = ?'; p.push(tecnico_id); }
  sql += ' ORDER BY criado_em DESC';
  return res.json(dbAll(sql, p));
}

function buscarChamado(req, res) {
  const c = dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ erro: 'Chamado não encontrado.' });
  if (req.user && req.user.tipo === 'cliente' && c.cliente_id !== req.user.id)
    return res.status(403).json({ erro: 'Acesso negado para este chamado.' });
  return res.json(c);
}

function aceitarChamado(req, res) {
  const { tecnico_id } = req.body;
  const tecnicoAutenticado = req.user ? req.user.id : tecnico_id;
  if (!tecnicoAutenticado) return res.status(400).json({ erro: 'tecnico_id é obrigatório.' });
  const c = dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ erro: 'Chamado não encontrado.' });
  if (c.status !== 'aberto') return res.status(409).json({ erro: `Status inválido: "${c.status}".` });
  const t = dbGet("SELECT * FROM usuarios WHERE id = ? AND tipo = 'tecnico'", [tecnicoAutenticado]);
  if (!t) return res.status(404).json({ erro: 'Técnico não encontrado.' });

  const recusaExistente = dbGet(
    'SELECT id FROM chamado_recusas WHERE chamado_id = ? AND tecnico_id = ?',
    [req.params.id, tecnicoAutenticado]
  );
  if (recusaExistente) {
    return res.status(409).json({ erro: 'Este técnico já recusou este chamado e não pode aceitá-lo.' });
  }

  dbRun(
    "UPDATE chamados SET status='aceito', tecnico_id=?, atualizado_em=datetime('now') WHERE id=? AND status='aberto'",
    [tecnicoAutenticado, req.params.id]
  );
  const chamadoAtualizado = dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
  if (!chamadoAtualizado || chamadoAtualizado.status !== 'aceito' || chamadoAtualizado.tecnico_id !== tecnicoAutenticado) {
    return res.status(409).json({ erro: 'Chamado já foi atualizado por outro técnico.' });
  }

  publicarEvento('chamado.aceito', req.params.id, { chamado_id: req.params.id, tecnico_id: tecnicoAutenticado });
  return res.json(chamadoAtualizado);
}

function recusarChamado(req, res) {
  const { tecnico_id } = req.body;
  const tecnicoAutenticado = req.user ? req.user.id : tecnico_id;
  if (!tecnicoAutenticado) return res.status(400).json({ erro: 'tecnico_id é obrigatório.' });
  const c = dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ erro: 'Chamado não encontrado.' });
  if (c.status !== 'aberto') return res.status(409).json({ erro: `Status inválido: "${c.status}".` });
  const t = dbGet("SELECT * FROM usuarios WHERE id = ? AND tipo = 'tecnico'", [tecnicoAutenticado]);
  if (!t) return res.status(404).json({ erro: 'Técnico não encontrado.' });

  const recusaExistente = dbGet(
    'SELECT id FROM chamado_recusas WHERE chamado_id = ? AND tecnico_id = ?',
    [req.params.id, tecnicoAutenticado]
  );
  if (recusaExistente) return res.status(409).json({ erro: 'Este técnico já recusou este chamado.' });

  const recusaId = uuidv4();
  dbRun(
    `INSERT INTO chamado_recusas (id, chamado_id, tecnico_id)
     SELECT ?, ?, ?
     WHERE EXISTS (SELECT 1 FROM chamados WHERE id = ? AND status = 'aberto')`,
    [recusaId, req.params.id, tecnicoAutenticado, req.params.id]
  );
  const recusaInserida = dbGet('SELECT id FROM chamado_recusas WHERE id = ?', [recusaId]);
  if (!recusaInserida) {
    return res.status(409).json({ erro: 'Chamado já foi atualizado por outro técnico.' });
  }

  const totalTecnicos = dbGet("SELECT COUNT(*) AS total FROM usuarios WHERE tipo = 'tecnico'");
  const recusasAnteriores = dbGet('SELECT COUNT(*) AS total FROM chamado_recusas WHERE chamado_id = ?', [req.params.id]);
  const totalRecusasAposAtual = recusasAnteriores?.total || 0;
  const encerraPorRecusaTotal = totalTecnicos && totalRecusasAposAtual >= totalTecnicos.total;
  const novoStatus = encerraPorRecusaTotal ? 'recusado_tecnicos' : 'aberto';

  dbRun("UPDATE chamados SET status=?, atualizado_em=datetime('now') WHERE id=? AND status='aberto'", [novoStatus, req.params.id]);
  const chamadoAtualizado = dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
  if (!chamadoAtualizado) return res.status(404).json({ erro: 'Chamado não encontrado.' });

  publicarEvento('chamado.recusado', req.params.id, {
    chamado_id: req.params.id,
    tecnico_id: tecnicoAutenticado,
    total_tecnicos: totalTecnicos ? totalTecnicos.total : 0,
    recusas: totalRecusasAposAtual,
    recusado_por_todos: encerraPorRecusaTotal,
  });
  return res.json(chamadoAtualizado);
}

function concluirChamado(req, res) {
  const { resultado } = req.body;
  if (!resultado || !['consertado','nao_consertado'].includes(resultado))
    return res.status(400).json({ erro: 'resultado deve ser "consertado" ou "nao_consertado".' });
  const c = dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ erro: 'Chamado não encontrado.' });
  if (c.status !== 'aprovado') return res.status(409).json({ erro: `Status inválido: "${c.status}".` });
  if (req.user && c.tecnico_id && c.tecnico_id !== req.user.id) return res.status(403).json({ erro: 'Acesso negado para este chamado.' });
  const novoStatus = resultado === 'consertado' ? 'concluido' : 'nao_concluido';
  dbRun("UPDATE chamados SET status=?, atualizado_em=datetime('now') WHERE id=?", [novoStatus, req.params.id]);
  publicarEvento('chamado.concluido', req.params.id, { chamado_id: req.params.id, resultado });
  return res.json(dbGet('SELECT * FROM chamados WHERE id = ?', [req.params.id]));
}

module.exports = { criarChamado, listarChamados, buscarChamado, aceitarChamado, recusarChamado, concluirChamado };
