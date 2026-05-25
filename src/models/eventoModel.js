const { v4: uuidv4 } = require('uuid');
const { dbRun, dbAll } = require('../config/database');
const amqp = require('amqplib');

// ── Conexão compartilhada com RabbitMQ ───────────────────────────────────────
let _conn = null;
let _channel = null;

/**
 * Retorna o canal AMQP, criando a conexão se necessário.
 * Reconecta automaticamente se a conexão cair.
 */
async function getChannel() {
  if (_channel) return _channel;

  const url = process.env.RABBITMQ_URL;
  if (!url) throw new Error('RABBITMQ_URL não definida no .env');

  _conn = await amqp.connect(url);

  // Reconectar automaticamente se a conexão cair
  _conn.on('close', () => {
    console.warn('[MOM] Conexão com RabbitMQ encerrada. Tentando reconectar...');
    _conn = null;
    _channel = null;
    setTimeout(getChannel, 5000);
  });
  _conn.on('error', (err) => {
    console.error('[MOM] Erro na conexão RabbitMQ:', err.message);
    _conn = null;
    _channel = null;
  });

  _channel = await _conn.createChannel();

  // Declara todas as filas como duráveis (sobrevivem a restart do broker)
  const filas = [
    'gamefix.chamado.criado',
    'gamefix.chamado.aceito',
    'gamefix.chamado.recusado',
    'gamefix.orcamento.enviado',
    'gamefix.orcamento.aprovado',
    'gamefix.orcamento.recusado',
    'gamefix.chamado.concluido',
  ];
  for (const fila of filas) {
    await _channel.assertQueue(fila, { durable: true });
  }

  console.log('[MOM] Conectado ao RabbitMQ. Filas declaradas.');
  return _channel;
}

/**
 * Fecha a conexão com o RabbitMQ de forma limpa.
 * Deve ser chamado ao encerrar o processo (SIGTERM).
 */
async function fecharConexao() {
  try {
    if (_channel) await _channel.close();
    if (_conn) await _conn.close();
  } catch (_) {}
  _channel = null;
  _conn = null;
}

// ── Mapeamento evento → fila ─────────────────────────────────────────────────
const FILA_POR_EVENTO = {
  'chamado.criado':      'gamefix.chamado.criado',
  'chamado.aceito':      'gamefix.chamado.aceito',
  'chamado.recusado':    'gamefix.chamado.recusado',
  'orcamento.enviado':   'gamefix.orcamento.enviado',
  'orcamento.aprovado':  'gamefix.orcamento.aprovado',
  'orcamento.recusado':  'gamefix.orcamento.recusado',
  'chamado.concluido':   'gamefix.chamado.concluido',
};

// ── Publicador ────────────────────────────────────────────────────────────────
/**
 * Publica um evento:
 *  1. Grava no banco (auditoria — mantido da Sprint 1)
 *  2. Publica na fila RabbitMQ correspondente (Sprint 2)
 *
 * A gravação no banco garante que, mesmo se o RabbitMQ estiver fora,
 * o evento não se perde (outbox pattern simplificado).
 */
async function publicarEvento(tipo, chamadoId, payload) {
  // 1. Auditoria no banco (síncrono — mantém comportamento da Sprint 1)
  try {
    dbRun(
      'INSERT INTO eventos (id, tipo, chamado_id, payload) VALUES (?,?,?,?)',
      [uuidv4(), tipo, chamadoId || null, JSON.stringify(payload)]
    );
    console.log(`[EVENTO] ${tipo}`, payload);
  } catch (err) {
    console.error('[EVENTO] Erro ao gravar no banco:', err.message);
  }

  // 2. Publicação no RabbitMQ (assíncrono — não bloqueia a resposta HTTP)
  const fila = FILA_POR_EVENTO[tipo];
  if (!fila) {
    console.warn(`[MOM] Nenhuma fila mapeada para evento: ${tipo}`);
    return;
  }

  const mensagem = JSON.stringify({
    event_id: uuidv4(),
    event_type: tipo,
    timestamp: new Date().toISOString(),
    payload,
  });

  // Publicação não-bloqueante: erros são logados mas não quebram a resposta HTTP
  getChannel()
    .then(ch => {
      ch.sendToQueue(fila, Buffer.from(mensagem), { persistent: true });
      console.log(`[MOM] Publicado em "${fila}"`);
    })
    .catch(err => {
      console.error(`[MOM] Falha ao publicar em "${fila}":`, err.message);
    });
}

// ── Endpoint de log de eventos (rota GET /api/eventos) ───────────────────────
function listarEventos(req, res) {
  const { chamado_id } = req.query;
  if (chamado_id) {
    return res.json(
      dbAll('SELECT * FROM eventos WHERE chamado_id = ? ORDER BY criado_em DESC', [chamado_id])
    );
  }
  return res.json(dbAll('SELECT * FROM eventos ORDER BY criado_em DESC'));
}

module.exports = { publicarEvento, listarEventos, getChannel, fecharConexao };
