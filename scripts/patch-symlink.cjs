'use strict';
/**
 * scripts/patch-symlink.cjs
 * Loaded via NODE_OPTIONS=--require before firebase-tools runs.
 * Intercepts fs.symlink / fs.symlinkSync / fs.promises.symlink:
 * when EPERM (Windows, no Developer Mode / no admin), falls back to
 * fs.cpSync (recursive directory copy) so Firebase Cloud Function
 * packaging succeeds without requiring elevated privileges.
 */
const fs   = require('fs');
const path = require('path');

function resolveTarget(target, linkPath) {
  return path.isAbsolute(target)
    ? target
    : path.resolve(path.dirname(linkPath), target);
}

function copyFallback(target, linkPath) {
  if (fs.existsSync(linkPath)) return; // already there (junction from prev attempt)
  const abs = resolveTarget(target, linkPath);
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) {
    fs.cpSync(abs, linkPath, { recursive: true });
  } else {
    fs.copyFileSync(abs, linkPath);
  }
}

// ── fs.symlink (callback) ────────────────────────────────────────────────────
const _symlink = fs.symlink.bind(fs);
fs.symlink = function (target, linkPath, type, callback) {
  if (typeof type === 'function') { callback = type; type = undefined; }
  _symlink(target, linkPath, type, function (err) {
    if (err && err.code === 'EPERM') {
      try { copyFallback(target, linkPath); callback(null); }
      catch (e2)                         { callback(err); }
    } else {
      callback(err);
    }
  });
};

// ── fs.symlinkSync ───────────────────────────────────────────────────────────
const _symlinkSync = fs.symlinkSync.bind(fs);
fs.symlinkSync = function (target, linkPath, type) {
  try { _symlinkSync(target, linkPath, type); }
  catch (err) {
    if (err.code !== 'EPERM') throw err;
    copyFallback(target, linkPath);
  }
};

// ── fs.promises.symlink ──────────────────────────────────────────────────────
const _promSymlink = fs.promises.symlink.bind(fs.promises);
fs.promises.symlink = async function (target, linkPath, type) {
  try { await _promSymlink(target, linkPath, type); }
  catch (err) {
    if (err.code !== 'EPERM') throw err;
    copyFallback(target, linkPath);
  }
};

console.error('[patch-symlink] fs.symlink EPERM fallback active (Windows compat)');
