#!/usr/bin/env node
/**
 * Run a .sql file (or inline SQL) against Postgres/Supabase WITHOUT psql.
 *
 * Connection string is read from the DATABASE_URL environment variable so the
 * password never appears on the command line.
 *
 * Usage (PowerShell):
 *   npm i pg
 *   $env:DATABASE_URL = "postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres"
 *   node scripts/run-sql.cjs supabase_schema.sql
 *   node scripts/run-sql.cjs seed_data.sql
 *   node scripts/run-sql.cjs docs/production/db-migrations/001_facility_scope_and_constraints.sql
 *   node scripts/run-sql.cjs --verify
 */
const fs = require('fs');
const path = require('path');

let Client;
try {
  ({ Client } = require('pg'));
} catch {
  console.error('Missing dependency "pg". Install it first:  npm i pg');
  process.exit(1);
}

const conn = process.env.DATABASE_URL;
if (!conn) {
  console.error('Set DATABASE_URL first, e.g. (PowerShell):');
  console.error('  $env:DATABASE_URL = "postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"');
  process.exit(1);
}

const VERIFY_SQL =
  "select (select count(*) from donations) as donations, " +
  "(select count(*) from components) as components, " +
  "(select count(*) from lab_tests) as lab_tests, " +
  "(select count(*) from translations) as translations;";

const arg = process.argv[2];
if (!arg) {
  console.error('Provide a .sql file path, inline SQL, or --verify');
  process.exit(1);
}

let sql;
let label;
if (arg === '--verify') {
  sql = VERIFY_SQL;
  label = 'verify';
} else if (arg.toLowerCase().endsWith('.sql')) {
  const p = path.resolve(process.cwd(), arg);
  if (!fs.existsSync(p)) {
    console.error('File not found:', p);
    process.exit(1);
  }
  sql = fs.readFileSync(p, 'utf8');
  label = arg;
} else {
  sql = arg; // treat as inline SQL
  label = 'inline';
}

(async () => {
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  const started = Date.now();
  try {
    await client.connect();
    console.log(`Connected. Running: ${label} ...`);
    const res = await client.query(sql);
    const results = Array.isArray(res) ? res : [res];
    for (const r of results) {
      if (r && r.command) console.log(`  ${r.command}${r.rowCount != null ? ' (' + r.rowCount + ' rows)' : ''}`);
      if (r && r.rows && r.rows.length) console.table(r.rows);
    }
    console.log(`DONE in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } catch (e) {
    console.error('\nSQL ERROR:', e.message);
    if (e.position) console.error('  at position', e.position);
    if (e.detail) console.error('  detail:', e.detail);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
})();
