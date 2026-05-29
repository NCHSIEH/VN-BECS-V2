#!/usr/bin/env node
/**
 * Generate a production admin (or any user) row with a bcrypt-hashed password.
 *
 * Production disables demo logins, so you must seed at least one real account.
 * This script PRINTS a ready-to-run SQL INSERT (it does not connect to the DB),
 * so you can paste it into the Supabase SQL Editor.
 *
 * Usage:
 *   node scripts/create-admin.cjs --username admin_tw --password 'StrongPass#123' --role Admin --org HUB-DN-03
 *
 * Flags (all optional except username & password):
 *   --username   login name (required)
 *   --password   plaintext password to hash (required)
 *   --role       role (default: Admin)
 *   --org        orgId / facility (default: HUB-DN-03)
 *   --id         user id (default: U-<random>)
 */
const bcrypt = require('bcryptjs');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const username = arg('username');
const password = arg('password');
const role = arg('role', 'Admin');
const orgId = arg('org', 'HUB-DN-03');
const id = arg('id', `U-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);

if (!username || !password) {
  console.error('ERROR: --username and --password are required.');
  console.error("Example: node scripts/create-admin.cjs --username admin_tw --password 'StrongPass#123' --role Admin --org HUB-DN-03");
  process.exit(1);
}

if (password.length < 8) {
  console.error('ERROR: choose a password of at least 8 characters for a production account.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
const permitted = role === 'Admin'
  ? 'MDM,IAM,HUB,LIMS,LAB,HOSPITAL,NATIONAL,DASHBOARD'
  : 'HOSPITAL,HUB,LIMS';

const sql = `-- Run this in the Supabase SQL Editor (production database).
INSERT INTO users (id, username, password, role, "orgId", permitted_systems, "isActive", "createdAt")
VALUES (
  '${id}',
  '${username.replace(/'/g, "''")}',
  '${hash}',
  '${role}',
  '${orgId}',
  '${permitted}',
  1,
  '${new Date().toISOString()}'
)
ON CONFLICT (username) DO UPDATE
  SET password = EXCLUDED.password, role = EXCLUDED.role, "isActive" = 1;`;

console.log('\n=== bcrypt hash ===\n' + hash);
console.log('\n=== SQL to run in Supabase ===');
console.log(sql + '\n');
console.log(`Login afterwards with username "${username}" and the password you supplied.`);
