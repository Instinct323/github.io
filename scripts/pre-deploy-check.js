#!/usr/bin/env node
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const steps = [
  { name: 'Type Check', cmd: 'pnpm typecheck' },
  { name: 'Lint', cmd: 'pnpm lint' },
  { name: 'Unit Tests', cmd: 'pnpm test' },
  { name: 'Build', cmd: 'pnpm build' },
];

let hasErrors = false;

console.log('🔍 Running pre-deployment checks...\n');

for (const step of steps) {
  console.log(`\n📋 ${step.name}...`);
  try {
    execSync(step.cmd, {
      cwd: rootDir,
      stdio: 'inherit',
      encoding: 'utf-8',
    });
    console.log(`✅ ${step.name} passed`);
  } catch {
    console.error(`❌ ${step.name} failed`);
    hasErrors = true;
    break;
  }
}

if (hasErrors) {
  console.error('\n❌ Pre-deployment checks failed. Fix errors before pushing.');
  process.exit(1);
} else {
  console.log('\n✅ All checks passed! Ready for deployment.');
  process.exit(0);
}
