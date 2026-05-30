#!/usr/bin/env node
/**
 * VAL-01 validation report generator.
 *
 * Ties each safety requirement (RTM) to its automated verification test and the
 * current pass/fail evidence, producing a CSV-validation (IQ/OQ/PQ) starting
 * point for Gate 3 sign-off.
 *
 * Usage:
 *   npx vitest run --reporter=json --outputFile=.tmp-vitest.json
 *   node scripts/gen-validation-report.cjs .tmp-vitest.json
 *
 * Writes docs/production/validation_report.md.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const jsonPath = process.argv[2] || '.tmp-vitest.json';
if (!fs.existsSync(jsonPath)) {
  console.error(`Vitest JSON not found: ${jsonPath}\nRun: npx vitest run --reporter=json --outputFile=${jsonPath}`);
  process.exit(1);
}
const results = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// file basename -> { status, total, passed }
const byFile = {};
for (const f of results.testResults || []) {
  const base = path.basename(f.name);
  const total = f.assertionResults.length;
  const passed = f.assertionResults.filter((a) => a.status === 'passed').length;
  byFile[base] = { status: f.status, total, passed };
}

// Curated RTM requirement -> verification test mapping + IQ/OQ/PQ classification.
const RTM = [
  ['RTM-AUTH-01', 'Server-verified actor identity (no client-supplied role)', ['sessionIdentity.test.ts'], 'OQ'],
  ['RTM-AUTH-02', 'RBAC authorization on high-risk actions', ['rbacPolicy.test.ts', 'sessionIdentity.test.ts'], 'OQ'],
  ['RTM-AUTH-03', 'Facility-scope isolation (ABAC + DB RLS scaffolding)', ['facilityScope.test.ts', 'rlsContext.test.ts', 'runScoped.test.ts'], 'OQ*'],
  ['RTM-AUTH-04', 'Demo/fallback login disabled in production', ['authPolicy.test.ts', 'productionHardening.test.ts'], 'OQ'],
  ['RTM-STATE-01', 'Centralized blood-unit state machine; illegal transitions blocked', ['stateMachine.test.ts'], 'OQ'],
  ['RTM-STATE-02', 'No route writes status outside the command service', ['h1DirectWrites.test.ts', 'noDirectStatusWrites.test.ts'], 'OQ'],
  ['RTM-STATE-03', 'Atomic multi-table transition (fail-closed + transaction scaffolding)', ['commandFailClosed.test.ts', 'transactionalTransition.test.ts'], 'OQ*'],
  ['RTM-STATE-04', 'Multi-axis status persisted by the command service', ['multiAxisStateWrite.test.ts'], 'OQ*'],
  ['RTM-REL-01/02', 'No release before IDM cleared; lookback blocks re-shelving', ['stateMachine.test.ts'], 'OQ'],
  ['RTM-XM-01', 'Component-class-aware ABO/Rh compatibility', ['componentCompatibility.test.ts', 'crossmatch.test.ts'], 'OQ'],
  ['RTM-XM-02', 'Crossmatch uses tested serology ABO (not donor registration)', ['crossmatchRoute.test.ts'], 'OQ'],
  ['RTM-XM-03/04/05', 'Antibody-history method rules, specimen validity, unknown-type block', ['crossmatch.test.ts', 'validators.test.ts'], 'OQ'],
  ['RTM-BED-01/02/03', 'Bedside dual verification, re-check ABO/Rh, clinical prerequisites', ['bedsideVerifyRoute.test.ts'], 'OQ'],
  ['RTM-ISS-01/02', 'Issue requires order/emergency; 30-min return rule', ['issueReturnRoute.test.ts', 'issueRouteOptimisticLock.test.ts'], 'OQ'],
  ['RTM-EMG-01', 'Emergency/MTP release policy (approver, indication, RhD, SLA)', ['emergencyPolicy.test.ts'], 'OQ'],
  ['RTM-DON-01/02/03', 'Donor eligibility, collection volume (VN26), deferral rules', ['validators.test.ts', 'collectionVolume.test.ts'], 'OQ'],
  ['RTM-DON-interval', 'Inter-donation interval (VN26/AABB 12 weeks)', ['donationInterval.test.ts'], 'OQ'],
  ['RTM-LBL-01', 'ISBT 128 DIN parse + check character', ['isbt128.test.ts'], 'OQ'],
  ['RTM-AUD-02', 'Audit hash-chain integrity verification', ['auditChainVerify.test.ts', 'auditChain.test.ts'], 'OQ'],
  ['RTM-OFF-01', 'Offline emergency-only, signed events, staleness review, idempotency', ['offlineSyncScenarios.test.ts', 'offlineHardening.test.ts'], 'OQ'],
  ['RTM-FHIR-01', 'FHIR R4 resource mappings', ['fhirAdapter.test.ts'], 'OQ'],
  ['RTM-TRACE-01', 'Donor<->recipient bidirectional traceability', ['traceability.test.ts'], 'OQ'],
  ['SEC-INJ-01', 'Patient lookup hardened against filter injection', ['patientIdInjection.test.ts'], 'OQ'],
];

// Requirements verified by means other than the automated OQ suite.
const MANUAL = [
  ['RTM-AUD-01', 'DB-enforced audit immutability (append-only)', 'db-migrations/001_tests.sql', 'IQ/PQ — run on a reachable Postgres test DB'],
  ['RTM-COLD-01', 'Validated cold-chain devices + excursion/CAPA', '—', 'PQ — requires cold-chain hardware (out of software scope)'],
  ['RTM-REG-01', 'Vietnam regulatory mapping + 12 clinical policy decisions', '00_vietnam_readiness_gap.md', 'Regulatory sign-off by authority/pilot site'],
  ['RTM-VAL-01', 'CSV validation package (this report) + IQ/OQ/PQ sign-off', 'this report', 'Pending reviewer sign-off'],
];

function evidence(files) {
  const known = files.filter((f) => byFile[f]);
  if (known.length === 0) return { mark: '⚪', text: '_no test found_' };
  const allPass = known.every((f) => byFile[f].status === 'passed');
  const totals = known.reduce((n, f) => n + byFile[f].total, 0);
  return { mark: allPass ? '✅' : '🔴', text: `${known.map((f) => `\`${f}\``).join(', ')} (${totals} assertions ${allPass ? 'PASS' : 'FAIL'})` };
}

let commit = 'unknown';
try { commit = execSync('git rev-parse --short HEAD').toString().trim(); } catch {}

const now = new Date().toISOString();
const lines = [];
lines.push('# VN-BECS-V2 Validation Report (RTM-VAL-01)');
lines.push('');
lines.push('> Auto-generated by `scripts/gen-validation-report.cjs` from the Vitest results.');
lines.push('> CSV-validation (IQ/OQ/PQ) evidence starting point for Gate 3 sign-off.');
lines.push('> Regenerate: `npx vitest run --reporter=json --outputFile=.tmp-vitest.json && node scripts/gen-validation-report.cjs`');
lines.push('');
lines.push(`- Generated: ${now}`);
lines.push(`- Commit: \`${commit}\``);
lines.push(`- Automated suite: **${results.numPassedTests}/${results.numTotalTests} passed** across ${results.testResults.length} files (${results.numFailedTests} failed)`);
lines.push('');
lines.push('Legend: ✅ verified (tests pass) · 🔴 failing · ⚪ no automated test · `OQ*` = OQ done in app layer, PQ pending live DB.');
lines.push('');
lines.push('## 1. Requirement verification matrix (OQ)');
lines.push('');
lines.push('| RTM ID | Requirement | Class | Verification test | Evidence |');
lines.push('|---|---|---|---|---|');
for (const [id, req, files, cls] of RTM) {
  const e = evidence(files);
  lines.push(`| ${id} | ${req} | ${cls} | ${e.mark} | ${e.text} |`);
}
lines.push('');
lines.push('## 2. Requirements verified outside the automated suite');
lines.push('');
lines.push('| RTM ID | Requirement | Evidence source | Verification path |');
lines.push('|---|---|---|---|');
for (const [id, req, src, how] of MANUAL) {
  lines.push(`| ${id} | ${req} | ${src} | ${how} |`);
}
lines.push('');
lines.push('## 3. Full automated test inventory');
lines.push('');
lines.push('| Test file | Assertions | Status |');
lines.push('|---|---|---|');
for (const base of Object.keys(byFile).sort()) {
  const r = byFile[base];
  lines.push(`| \`${base}\` | ${r.passed}/${r.total} | ${r.status === 'passed' ? '✅ PASS' : '🔴 FAIL'} |`);
}
lines.push('');
lines.push('## 4. Sign-off (to be completed by reviewers)');
lines.push('');
lines.push('| Phase | Scope | Owner | Date | Signature |');
lines.push('|---|---|---|---|---|');
lines.push('| IQ (Installation) | Schema + migration 001 applied; env/secrets set | | | |');
lines.push('| OQ (Operational) | Automated suite green (this report) | | | |');
lines.push('| PQ (Performance) | Live-DB evidence (RLS/atomicity/audit immutability), UAT scenarios | | | |');
lines.push('');
lines.push('> ⚠️ This report covers software OQ evidence. Gate 3 also requires REG-01 (regulatory), COLD-01 (cold-chain hardware), and the live-DB PQ evidence captured per `DB_MIGRATION_WORK_PACKAGE.md`.');
lines.push('');

const out = path.join('docs', 'production', 'validation_report.md');
fs.writeFileSync(out, lines.join('\n'));
console.log(`Wrote ${out} — ${results.numPassedTests}/${results.numTotalTests} tests, ${RTM.length} OQ rows, ${MANUAL.length} manual rows.`);
