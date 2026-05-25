const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

function getDatabasePath() {
  return path.resolve(process.env.DB_PATH || './db/gamefix.db');
}

async function openDatabase() {
  const SQL = await initSqlJs();
  const dbPath = getDatabasePath();
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = fs.existsSync(dbPath)
    ? new SQL.Database(fs.readFileSync(dbPath))
    : new SQL.Database();

  db.run('PRAGMA foreign_keys = ON;');
  return { db, dbPath };
}

function persistDatabase(db, dbPath) {
  if (!db) return;
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

module.exports = { openDatabase, persistDatabase, getDatabasePath };
