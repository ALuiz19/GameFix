function dbAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function ensureColumn(db, table, column, definition) {
  const columns = dbAll(db, `PRAGMA table_info(${table});`);
  if (!columns.some((c) => c.name === column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  }
}

function runMigrations(db) {
  // Mantem compatibilidade com bancos antigos que nao tinham senha_hash.
  ensureColumn(db, 'usuarios', 'senha_hash', 'TEXT');
}

module.exports = { runMigrations };
