const { v4: uuidv4 } = require('uuid');
const { dbRun, dbAll } = require('../config/database');

function publicarEvento(tipo, chamadoId, payload) {
  try {
    dbRun('INSERT INTO eventos (id, tipo, chamado_id, payload) VALUES (?,?,?,?)',
      [uuidv4(), tipo, chamadoId||null, JSON.stringify(payload)]);
    console.log(`[EVENTO] ${tipo}`, payload);
  } catch (err) {
    console.error('[EVENTO] Erro:', err.message);
  }
}

function listarEventos(req, res) {
  const { chamado_id } = req.query;
  if (chamado_id) return res.json(dbAll('SELECT * FROM eventos WHERE chamado_id = ? ORDER BY criado_em DESC', [chamado_id]));
  return res.json(dbAll('SELECT * FROM eventos ORDER BY criado_em DESC'));
}

module.exports = { publicarEvento, listarEventos };
