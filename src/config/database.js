const { openDatabase, persistDatabase, getDatabasePath } = require('../database/connection');
const { TABLE_STATEMENTS, INDEX_STATEMENTS } = require('../database/schema');
const { runMigrations } = require('../database/migrations');

const DB_PATH = getDatabasePath();
let db = null;

async function initDb() {
  const connection = await openDatabase();
  db = connection.db;

  for (const statement of TABLE_STATEMENTS) {
    db.run(statement);
  }
  for (const statement of INDEX_STATEMENTS) {
    db.run(statement);
  }

  runMigrations(db);
  saveDb();
  console.log('[DB] Banco inicializado.');
}

function getDb() {
  if (!db) throw new Error('Banco não inicializado.');
  return db;
}

function saveDb() {
  if (!db) return;
  persistDatabase(db, DB_PATH);
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
