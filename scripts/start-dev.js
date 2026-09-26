/**
 * Cross-platform turnkey launcher for Smart Library System
 * Launches backend Express API and frontend Next.js dev server concurrently.
 */
const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('====================================================');
console.log(' Starting Smart Library Book Management System     ');
console.log('====================================================');

// Launch Backend
console.log('[SPAWN] Starting Backend API (Port 5000)...');
const backend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(rootDir, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Launch Frontend
console.log('[SPAWN] Starting Frontend UI (Port 3000)...');
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(rootDir, 'frontend'),
  stdio: 'inherit',
  shell: true
});

function shutdown() {
  console.log('\n[SHUTDOWN] Stopping all Smart Library processes...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
