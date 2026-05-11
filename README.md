# GameFix – Backend REST

> Sistema de Assistência Técnica para Videogames  
> PUC Minas – Engenharia de Software | LDAMD | Sprint 1

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Banco de dados | SQLite (via sql.js) |
| Eventos (Sprint 1) | Log interno em tabela eventos |
| MOM (Sprint 2) | RabbitMQ (planejado) |

---

## Instalação e execução

```bash
# Instalar dependências
npm install

# Criar arquivo de ambiente
# Linux/macOS
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env

# Executar em desenvolvimento
npm run dev

# Executar em produção
npm start
```

O servidor sobe na porta `3000` por padrão. Altere em `.env` se necessário.

---

## Schema do Banco de Dados

### Tabela: `usuarios`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | TEXT | PK | UUID v4 gerado automaticamente |
| `nome` | TEXT | NOT NULL | Nome completo |
| `email` | TEXT | NOT NULL, UNIQUE | E-mail de login |
| `telefone` | TEXT | | Telefone opcional |
| `tipo` | TEXT | NOT NULL, CHECK('cliente','tecnico') | Perfil do usuário |
| `criado_em` | TEXT | DEFAULT datetime('now') | Timestamp de criação |

### Tabela: `chamados`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | TEXT | PK | UUID v4 |
| `cliente_id` | TEXT | FK → usuarios(id) | Cliente que abriu o chamado |
| `aparelho` | TEXT | NOT NULL | Tipo do aparelho (ex: PlayStation 5) |
| `modelo` | TEXT | NOT NULL | Modelo específico (ex: CFI-1215A) |
| `descricao_defeito` | TEXT | NOT NULL | Descrição do problema relatado |
| `status` | TEXT | CHECK(enum) | Status atual do chamado |
| `tecnico_id` | TEXT | FK → usuarios(id) | Técnico responsável (nullable) |
| `criado_em` | TEXT | DEFAULT datetime('now') | Timestamp de criação |
| `atualizado_em` | TEXT | DEFAULT datetime('now') | Timestamp da última atualização |

**Status possíveis do chamado:**
```
aberto → aceito → aguardando_aprovacao → aprovado → concluido
                                       ↘ recusado_cliente
       ↘ recusado_tecnico
                                                   ↘ nao_concluido
```

### Tabela: `orcamentos`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | TEXT | PK | UUID v4 |
| `chamado_id` | TEXT | FK → chamados(id) | Chamado associado |
| `valor` | REAL | NOT NULL | Valor em R$ do serviço |
| `descricao` | TEXT | | Detalhamento do orçamento |
| `status` | TEXT | CHECK('pendente','aprovado','recusado') | Status de aprovação |
| `criado_em` | TEXT | DEFAULT datetime('now') | Timestamp de criação |

### Tabela: `eventos`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | TEXT | PK | UUID v4 |
| `tipo` | TEXT | NOT NULL | Nome do evento (ex: chamado.criado) |
| `chamado_id` | TEXT | FK → chamados(id) | Chamado associado |
| `payload` | TEXT | NOT NULL | JSON com dados do evento |
| `criado_em` | TEXT | DEFAULT datetime('now') | Timestamp |

---

## Endpoints REST

### Usuários

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/usuarios` | Cria um novo usuário (cliente ou técnico) |
| GET | `/api/usuarios` | Lista usuários (filtro: `?tipo=cliente`) |
| GET | `/api/usuarios/:id` | Busca usuário por ID |

### Chamados

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/chamados` | Abre um novo chamado |
| GET | `/api/chamados` | Lista chamados (filtros: `?status=`, `?cliente_id=`, `?tecnico_id=`) |
| GET | `/api/chamados/:id` | Busca chamado por ID |
| PATCH | `/api/chamados/:id/aceitar` | Técnico aceita o chamado |
| PATCH | `/api/chamados/:id/recusar` | Técnico recusa o chamado |
| PATCH | `/api/chamados/:id/concluir` | Técnico finaliza o reparo |

### Orçamentos

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/chamados/:id/orcamento` | Técnico envia orçamento |
| GET | `/api/chamados/:id/orcamento` | Consulta orçamento do chamado |
| PATCH | `/api/chamados/:id/orcamento/responder` | Cliente aprova ou recusa orçamento |

### Utilitários

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/eventos` | Lista log de eventos (filtro: `?chamado_id=`) |
| GET | `/health` | Health check da API |

---

## Fluxo de Eventos (MOM – Sprint 2)

Na Sprint 1, os eventos sao persistidos na tabela `eventos` para auditoria e testes.
Nao ha publicacao em broker externo ainda.

| Evento | Produtor | Consumidor | Descrição |
|--------|----------|-----------|-----------|
| `chamado.criado` | Backend | App Técnico | Novo chamado disponível |
| `chamado.aceito` | Backend | App Cliente | Técnico aceitou o chamado |
| `chamado.recusado` | Backend | App Cliente | Técnico recusou o chamado |
| `orcamento.enviado` | Backend | App Cliente | Orçamento disponível para aprovação |
| `orcamento.aprovado` | Backend | App Técnico | Cliente aprovou; iniciar reparo |
| `orcamento.recusado` | Backend | App Técnico | Cliente recusou; chamado encerrado |
| `chamado.concluido` | Backend | App Cliente | Reparo finalizado |

---

## Estrutura do Projeto

```
gamefix-backend/
├── src/
│   ├── index.js                  # Entry point
│   ├── config/
│   │   └── database.js           # Conexão e inicialização do SQLite
│   ├── routes/
│   │   └── index.js              # Definição de todas as rotas
│   ├── controllers/
│   │   ├── usuariosController.js
│   │   ├── chamadosController.js
│   │   └── orcamentosController.js
│   ├── models/
│   │   └── eventoModel.js        # Publicação de eventos (stub → RabbitMQ na Sprint 2)
│   └── middlewares/
│       └── errorHandler.js
├── db/                           # Arquivo SQLite gerado em runtime
├── .env
├── package.json
└── README.md
```

---

## Colecao de Testes (Postman)

Arquivo da colecao para validacao da Sprint 1:

- `postman/GameFix_Sprint1.postman_collection.json`

Fluxo sugerido de execucao da colecao:

1. Health
2. Criar Cliente
3. Criar Tecnico
4. Abrir Chamado
5. Aceitar Chamado
6. Enviar Orcamento
7. Aprovar Orcamento
8. Concluir Chamado
9. Listar Eventos
