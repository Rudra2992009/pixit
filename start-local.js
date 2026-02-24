#!/usr/bin/env node
const { spawn } = require('child_process');

console.log('Starting AuraCode local environment...');

// Spawn launcher.py to start native nodes (python backend, C++ bridge, etc.)
const launcher = spawn('python3', ['launcher.py'], { stdio: 'inherit', detached: true });

launcher.on('error', (err) => {
  console.error('Failed to start launcher.py:', err);
});

// Give launcher a moment to compile/start services
setTimeout(() => {
  console.log('Starting static server (serve) on port 54000...');
  const serve = spawn('npx', ['serve', '.', '-p', '54000'], { stdio: 'inherit' });

  serve.on('error', (err) => {
    console.error('Failed to start static server:', err);
  });

  serve.on('exit', (code) => {
    console.log('Static server exited with code', code);
    process.exit(code);
  });
}, 1500);

process.on('SIGINT', () => {
  console.log('Shutting down starter...');
  try { process.kill(-launcher.pid); } catch(e) {}
  process.exit();
});
