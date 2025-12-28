/**
 * Master test runner - runs all tests
 */

import { spawn } from 'child_process';

function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
            stdio: 'inherit',
            shell: true
        });

        proc.on('close', (code) => {
            resolve(code);
        });

        proc.on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Blocks Kernel - Complete Test Suite');
    console.log('═══════════════════════════════════════════════════════\n');

    let totalFailed = 0;

    // Module tests
    console.log('Running Module Tests...\n');
    const moduleCode = await runCommand('node', ['tests/run-module-tests.js']);
    if (moduleCode !== 0) totalFailed++;

    console.log('\n');

    // Auto integration tests
    console.log('Running auto() Integration Tests...\n');
    const autoCode = await runCommand('node', ['tests/run-auto-tests.js']);
    if (autoCode !== 0) totalFailed++;

    console.log('\n═══════════════════════════════════════════════════════');
    if (totalFailed === 0) {
        console.log('  ✓ ALL TESTS PASSED');
    } else {
        console.log(`  ✗ ${totalFailed} TEST SUITE(S) FAILED`);
    }
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(console.error);
