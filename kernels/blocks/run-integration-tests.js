/**
 * Integration test runner for blocks kernel
 */

import DirectedGraph from './src/directed-graph.js';
import { Resolver } from './src/resolver.js';
import { readdir } from 'fs/promises';
import { pathToFileURL } from 'url';
import { join } from 'path';

async function runTests() {
    console.log('=== BLOCKS KERNEL INTEGRATION TESTS ===\n');

    // Find all integration test files
    const files = await readdir('tests/integration');
    const testFiles = files.filter(f => f.endsWith('.js')).map(f => join('tests/integration', f));

    let passed = 0;
    let failed = 0;

    for (const testFile of testFiles) {
        const testName = testFile.split('/').pop().replace('.js', '');
        console.log(`\n📝 ${testName}`);

        try {
            // Import the test
            const testModule = await import(pathToFileURL(testFile).href);
            const test = testModule.default;

            // Run setup
            const context = test.setup({ DirectedGraph, Resolver });

            // Run tests
            const result = await test.tests(context);

            console.log(`   ✅ PASSED`);
            if (Array.isArray(result)) {
                result.forEach(r => console.log(`      ${JSON.stringify(r)}`));
            } else if (result) {
                console.log(`      ${JSON.stringify(result)}`);
            }
            passed++;

        } catch (error) {
            console.log(`   ❌ FAILED`);
            console.log(`      ${error.message}`);
            if (error.stack) {
                const stackLines = error.stack.split('\n').slice(1, 4);
                stackLines.forEach(line => console.log(`      ${line.trim()}`));
            }
            failed++;
        }
    }

    console.log(`\n\n=== RESULTS ===`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
