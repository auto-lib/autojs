#!/usr/bin/env node
/**
 * Monitor prices-app console for errors
 * Usage: node watch-errors.mjs [--follow]
 */

import fs from 'fs';
import { spawn } from 'child_process';

const LOGFILE = '/Users/karl/prices-app/mcp/.claude/mapped-console.jsonl';
const CONTROL_FILE = '/Users/karl/prices-app/mcp/.claude/cdp-control.json';

const args = process.argv.slice(2);
const follow = args.includes('--follow') || args.includes('-f');

function sendControl(command) {
  fs.writeFileSync(CONTROL_FILE, JSON.stringify(command));
}

function formatEntry(entry) {
  const e = JSON.parse(entry);
  const timestamp = new Date(e.ts).toLocaleTimeString();
  const type = e.type.replace('console.', '');
  const uf = e.userFrame;
  const location = uf?.url ? ` @ ${uf.url}:${uf.line || ''}` : '';

  return `[${timestamp}] ${type}: ${e.text}${location}`;
}

function displayErrors(lines) {
  const errors = lines.filter(line => {
    try {
      const entry = JSON.parse(line);
      return entry.type === 'console.error' || entry.type === 'exception';
    } catch {
      return false;
    }
  });

  if (errors.length === 0) {
    console.log('✅ No errors found');
    return;
  }

  console.log(`\n🔴 Found ${errors.length} error(s):\n`);
  errors.forEach(err => console.log(formatEntry(err)));
}

if (follow) {
  console.log('👁️  Watching for errors (Ctrl+C to stop)...\n');
  const tail = spawn('tail', ['-f', LOGFILE]);

  tail.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (!line) return;
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'console.error' || entry.type === 'exception') {
          console.log(formatEntry(line));
        }
      } catch {}
    });
  });

  tail.on('close', () => process.exit(0));
} else {
  // One-time check with reload
  console.log('🔄 Reloading page and checking for errors...\n');

  // Clear log and reload
  sendControl({ command: 'clear' });
  setTimeout(() => {
    sendControl({ command: 'reload' });

    // Wait for page to load
    setTimeout(() => {
      const data = fs.readFileSync(LOGFILE, 'utf8');
      const lines = data.split('\n').filter(Boolean);
      displayErrors(lines);
    }, 2000);
  }, 100);
}
