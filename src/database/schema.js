const TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefone TEXT,
    tipo TEXT NOT NULL CHECK(tipo IN ('cliente','tecnico')),
    senha_hash TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS chamados (
    id TEXT PRIMARY KEY,
    cliente_id TEXT NOT NULL REFERENCES usuarios(id),
    aparelho TEXT NOT NULL,
    modelo TEXT NOT NULL,
    descricao_defeito TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'aberto',
    tecnico_id TEXT REFERENCES usuarios(id),
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS chamado_recusas (
    id TEXT PRIMARY KEY,
    chamado_id TEXT NOT NULL REFERENCES chamados(id),
    tecnico_id TEXT NOT NULL REFERENCES usuarios(id),
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(chamado_id, tecnico_id)
  );`,
  `CREATE TABLE IF NOT EXISTS orcamentos (
    id TEXT PRIMARY KEY,
    chamado_id TEXT NOT NULL REFERENCES chamados(id),
    valor REAL NOT NULL,
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS eventos (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    chamado_id TEXT REFERENCES chamados(id),
    payload TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
];

const INDEX_STATEMENTS = [
  'CREATE INDEX IF NOT EXISTS idx_chamados_status ON chamados(status);',
  'CREATE INDEX IF NOT EXISTS idx_chamados_cliente_id ON chamados(cliente_id);',
  'CREATE INDEX IF NOT EXISTS idx_chamados_tecnico_id ON chamados(tecnico_id);',
  'CREATE INDEX IF NOT EXISTS idx_chamado_recusas_chamado_id ON chamado_recusas(chamado_id);',
  'CREATE INDEX IF NOT EXISTS idx_orcamentos_chamado_id ON orcamentos(chamado_id);',
  'CREATE INDEX IF NOT EXISTS idx_eventos_chamado_id ON eventos(chamado_id);',
  'CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo);',
];

module.exports = { TABLE_STATEMENTS, INDEX_STATEMENTS };
