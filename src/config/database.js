const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(process.env.DB_PATH || './db/gamefix.db');
let db = null;

async function initDb() {
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON;');
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY, nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    telefone TEXT, tipo TEXT NOT NULL CHECK(tipo IN ('cliente','tecnico')),
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS chamados (
    id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL REFERENCES usuarios(id),
    aparelho TEXT NOT NULL, modelo TEXT NOT NULL, descricao_defeito TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'aberto', tecnico_id TEXT REFERENCES usuarios(id),
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS orcamentos (
    id TEXT PRIMARY KEY, chamado_id TEXT NOT NULL REFERENCES chamados(id),
    valor REAL NOT NULL, descricao TEXT, status TEXT NOT NULL DEFAULT 'pendente',
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS eventos (
    id TEXT PRIMARY KEY, tipo TEXT NOT NULL, chamado_id TEXT REFERENCES chamados(id),
    payload TEXT NOT NULL, criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
  saveDb();
  console.log('[DB] Banco inicializado.');
}

function getDb() {
  if (!db) throw new Error('Banco não inicializado.');
  return db;
}

function saveDb() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function dbAll(sql, params = []) {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) {
  return dbAll(sql, params)[0] || null;
}

function dbRun(sql, params = []) {
  getDb().run(sql, params);
  saveDb();
}

module.exports = { initDb, getDb, saveDb, dbAll, dbGet, dbRun };
