# GameFix – Backend REST

> Sistema de Assistência Técnica para Videogames  
> PUC Minas – Engenharia de Software | LDAMD | Sprint 2

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Banco de dados | SQLite (via sql.js) |
| Autenticação | JWT + bcryptjs |
| MOM | RabbitMQ via CloudAMQP (amqplib) |
| Auditoria de eventos | Tabela `eventos` + publicação RabbitMQ |

---

## Instalação e execução

```bash
npm install
cp .env.example .env
# Edite .env e preencha RABBITMQ_URL com sua URL do CloudAMQP

# Terminal 1 — API
npm run dev

# Terminal 2 — Worker (consumidor de eventos)
npm run worker
```

---

## Arquitetura de Mensageria (Sprint 2)

### Regras de recusa de chamado (atualizado)

- Cada recusa é registrada por técnico na tabela `chamado_recusas`.
- Após uma recusa individual, o chamado permanece com status `aberto`.
- O status muda para `recusado_tecnicos` apenas quando todos os técnicos recusarem.
- O evento `chamado.recusado` é publicado com indicadores de progresso (`recusas`, `total_tecnicos`, `recusado_por_todos`).

### Filas RabbitMQ

| Fila | Evento | Produtor | Consumidor |
|------|--------|----------|------------|
| `gamefix.chamado.criado` | chamado.criado | Backend | Worker → App Técnico |
| `gamefix.chamado.aceito` | chamado.aceito | Backend | Worker → App Cliente |
| `gamefix.chamado.recusado` | chamado.recusado | Backend | Worker → App Cliente |
| `gamefix.orcamento.enviado` | orcamento.enviado | Backend | Worker → App Cliente |
| `gamefix.orcamento.aprovado` | orcamento.aprovado | Backend | Worker → App Técnico |
| `gamefix.orcamento.recusado` | orcamento.recusado | Backend | Worker → App Técnico |
| `gamefix.chamado.concluido` | chamado.concluido | Backend | Worker → App Cliente |

### Envelope de mensagem (payload JSON)

```json
{
  "event_id": "uuid-v4",
  "event_type": "chamado.criado",
  "timestamp": "2026-05-25T20:00:00.000Z",
  "payload": {
    "chamado_id": "uuid-v4",
    "cliente_id": "uuid-v4",
    "aparelho": "PlayStation 5",
    "modelo": "CFI-1215A"
  }
}
```

### Fluxo de comunicação assíncrona

```
Cliente HTTP                Backend (Express)           RabbitMQ              Worker
     │                            │                         │                    │
     │── POST /api/chamados ──────▶│                         │                    │
     │                            │── INSERT eventos ───────▶│ (auditoria DB)     │
     │                            │── sendToQueue ──────────▶│ gamefix.chamado.criado
     │◀── 201 Created ────────────│                         │                    │
     │                            │                         │── consume ─────────▶│
     │                            │                         │                    │── handler()
     │                            │                         │                    │── ack()
```

---

## Estrutura do Projeto

```
gamefix-backend/
├── src/
│   ├── index.js
│   ├── config/
│   │   └── database.js
│   ├── database/
│   │   ├── connection.js
│   │   ├── migrations.js
│   │   └── schema.js
│   ├── routes/
│   │   └── index.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── chamadosController.js
│   │   ├── orcamentosController.js
│   │   └── usuariosController.js
│   ├── models/
│   │   └── eventoModel.js       ← Publicador RabbitMQ (Sprint 2)
│   ├── middlewares/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   └── workers/
│       └── worker.js            ← Consumidor RabbitMQ (Sprint 2)
├── db/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```
