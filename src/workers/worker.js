/**
 * GameFix – Worker de Eventos (Sprint 2)
 *
 * Processo independente que consome as filas RabbitMQ e simula
 * o comportamento que os apps Flutter terão nas Sprints 3 e 4.
 *
 * Execução: node src/workers/worker.js
 */
require('dotenv').config();
const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL;

// ── Handlers por tipo de evento ───────────────────────────────────────────────
const handlers = {
  'chamado.criado': (payload) => {
    console.log(`  📋 Novo chamado disponível para técnicos`);
    console.log(`     Aparelho : ${payload.aparelho}`);
    console.log(`     Cliente  : ${payload.cliente_id}`);
    console.log(`  → [App Técnico] Notificaria técnicos disponíveis`);
  },

  'chamado.aceito': (payload) => {
    console.log(`  ✅ Chamado aceito por técnico`);
    console.log(`     Técnico  : ${payload.tecnico_id}`);
    console.log(`  → [App Cliente] Notificaria o cliente do aceite`);
  },

  'chamado.recusado': (payload) => {
    if (payload.recusado_por_todos) {
      console.log(`  ❌ Chamado recusado por todos os técnicos`);
      console.log(`     Recusas : ${payload.recusas}/${payload.total_tecnicos}`);
      console.log(`  → [App Cliente] Notificaria o cliente de que ninguém aceitou o serviço`);
      return;
    }

    console.log(`  ⚠ Chamado recusado por um técnico`);
    console.log(`     Técnico  : ${payload.tecnico_id}`);
    console.log(`     Recusas  : ${payload.recusas}/${payload.total_tecnicos}`);
    console.log(`  → [App Cliente] Notificaria o cliente de mais uma recusa`);
  },

  'orcamento.enviado': (payload) => {
    console.log(`  💰 Orçamento disponível para aprovação`);
    console.log(`     Valor    : R$ ${payload.valor}`);
    console.log(`  → [App Cliente] Notificaria o cliente para aprovar/recusar`);
  },

  'orcamento.aprovado': (payload) => {
    console.log(`  👍 Orçamento aprovado pelo cliente`);
    console.log(`  → [App Técnico] Notificaria o técnico para iniciar o reparo`);
  },

  'orcamento.recusado': (payload) => {
    console.log(`  👎 Orçamento recusado pelo cliente — chamado encerrado`);
    console.log(`  → [App Técnico] Notificaria o técnico do encerramento`);
  },

  'chamado.concluido': (payload) => {
    console.log(`  🔧 Reparo finalizado`);
    console.log(`     Resultado: ${payload.resultado}`);
    console.log(`  → [App Cliente] Notificaria o cliente que o aparelho está pronto`);
  },
};

// ── Filas que este worker consome ─────────────────────────────────────────────
const FILAS = Object.keys(handlers).map(tipo => `gamefix.${tipo}`);

// ── Lógica de consumo ─────────────────────────────────────────────────────────
async function iniciarWorker() {
  if (!RABBITMQ_URL) {
    console.error('[Worker] RABBITMQ_URL não definida no .env');
    process.exit(1);
  }

  console.log('[Worker] Conectando ao RabbitMQ...');
  const conn = await amqp.connect(RABBITMQ_URL);
  const canal = await conn.createChannel();

  // prefetch=1: processa uma mensagem por vez (fair dispatch)
  canal.prefetch(1);

  // Declara e assina todas as filas
  for (const fila of FILAS) {
    await canal.assertQueue(fila, { durable: true });

    canal.consume(fila, async (msg) => {
      if (!msg) return;

      let envelope;
      try {
        envelope = JSON.parse(msg.content.toString());
      } catch {
        console.error('[Worker] Mensagem inválida — descartando');
        canal.nack(msg, false, false); // dead-letter sem requeue
        return;
      }

      const { event_id, event_type, timestamp, payload } = envelope;

      console.log('\n─────────────────────────────────────────────');
      console.log(`[Worker] Evento recebido`);
      console.log(`  Fila      : ${fila}`);
      console.log(`  Tipo      : ${event_type}`);
      console.log(`  ID evento : ${event_id}`);
      console.log(`  Timestamp : ${timestamp}`);
      console.log(`  Payload   : ${JSON.stringify(payload)}`);

      // Simula processamento (latência de notificação push)
      const tempoMs = Math.floor(Math.random() * 500) + 200;
      await new Promise(r => setTimeout(r, tempoMs));

      // Executa o handler específico do evento
      const handler = handlers[event_type];
      if (handler) {
        handler(payload);
      } else {
        console.warn(`  ⚠ Handler não encontrado para: ${event_type}`);
      }

      console.log(`  ⏱ Processado em ${tempoMs}ms`);

      // Confirma ao broker que a mensagem foi processada com sucesso
      canal.ack(msg);
    });

    console.log(`[Worker] Consumindo fila: ${fila}`);
  }

  console.log('\n[Worker] ✅ Aguardando eventos do GameFix...\n');

  // Encerramento limpo
  process.on('SIGINT', async () => {
    console.log('\n[Worker] Encerrando conexão...');
    await canal.close();
    await conn.close();
    process.exit(0);
  });
}

iniciarWorker().catch(err => {
  console.error('[Worker] Erro fatal:', err.message);
  process.exit(1);
});
