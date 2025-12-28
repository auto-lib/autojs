/**
 * TEST FRAMEWORK - URL + Data + Code + Chart Testing
 *
 * Implements the diff-driven testing philosophy:
 * 1. Load data from URL
 * 2. Run code (blocks) with data
 * 3. Produce chart (output)
 * 4. Modify code and re-run
 * 5. Diff charts, trace causality
 *
 * Test structure:
 * {
 *   url: 'http://api.example.com/data' or static data
 *   data: null (loaded from url) or static object
 *   code: [block configs] or single block
 *   chart: null (computed output)
 * }
 */

import { block, autoWire, runAll } from './block.js';
import { buildCrossBlockGraph, traceChange, analyzeGraph } from './cross-block-graph.js';
import { diff, diffGraph, diffBlocks, formatDiff } from './diff.js';

/**
 * Create a test from config
 */
function createTest(config) {
    const {
        name = 'unnamed-test',
        url = null,
        data = null,
        code = [],
        fetcher = null
    } = config;

    return {
        name,
        url,
        data,
        code: Array.isArray(code) ? code : [code],
        fetcher,
        result: null
    };
}

/**
 * Run a test - execute code with data, produce result
 */
async function runTest(test) {
    // 1. Load data from URL if needed
    let data = test.data;
    if (test.url && !data && test.fetcher) {
        data = await test.fetcher(test.url);
    } else if (test.url && !data) {
        throw new Error('URL provided but no fetcher available');
    }

    // 2. Create blocks from code
    const blocks = test.code.map((blockConfig, index) => {
        // If config doesn't have a name, generate one
        if (!blockConfig.name) {
            blockConfig = { ...blockConfig, name: `block${index}` };
        }

        return block(blockConfig);
    });

    // 3. Wire blocks together
    if (blocks.length > 1) {
        autoWire(blocks);
    }

    // 4. Inject data into blocks (set values for 'needs' variables)
    for (let b of blocks) {
        for (let need of b.needs) {
            if (data && need in data) {
                b.set(need, data[need]);
            }
        }
    }

    // 5. Run until stable
    const steps = runAll(blocks);

    // 6. Build cross-block graph
    const graph = buildCrossBlockGraph(blocks);

    // 7. Extract chart (output from blocks that 'give' values)
    const chart = {};
    for (let b of blocks) {
        for (let give of b.gives) {
            chart[`${b.name}.${give}`] = b.get(give);
        }
    }

    // 8. Return result
    const result = {
        data,
        blocks,
        graph,
        chart,
        steps,
        analysis: analyzeGraph(graph, blocks)
    };

    test.result = result;
    return result;
}

/**
 * Compare two test results - diff everything
 */
function compareResults(result1, result2) {
    return {
        data: diff(result1.data, result2.data),
        chart: diff(result1.chart, result2.chart),
        graph: diffGraph(result1.graph, result2.graph),
        blocks: diffBlocks(result1.blocks, result2.blocks),
        analysis: {
            before: result1.analysis,
            after: result2.analysis
        }
    };
}

/**
 * Trace causality from chart changes back to triggering code
 */
function traceCausality(comparison, result1, result2) {
    const traces = [];

    // Find changed chart values
    const chartDiff = comparison.chart;

    if (chartDiff.type === 'changed' && chartDiff.changed) {
        for (let [key, change] of Object.entries(chartDiff.changed)) {
            // Parse block.variable format
            const [blockName, varName] = key.split('.');

            // Trace backwards from this variable
            const affectingVars = result2.graph.getAncestors([key]);

            traces.push({
                chartVariable: key,
                blockName,
                varName,
                change: {
                    before: change.before,
                    after: change.after
                },
                affectedBy: Array.from(affectingVars).map(nodeId => {
                    const meta = result2.graph.nodes.get(nodeId);
                    return {
                        node: nodeId,
                        block: meta.block,
                        variable: meta.variable
                    };
                })
            });
        }
    }

    return traces;
}

/**
 * Run a test suite - multiple tests with comparison
 */
async function runTestSuite(tests) {
    const results = [];

    for (let test of tests) {
        const result = await runTest(test);
        results.push({
            test,
            result
        });
    }

    return results;
}

/**
 * Diff-driven test workflow:
 * 1. Run test with original code
 * 2. Run test with modified code
 * 3. Compare results
 * 4. Trace causality
 */
async function diffDrivenTest(config) {
    const {
        name = 'diff-test',
        url = null,
        data = null,
        fetcher = null,
        codeOriginal,
        codeModified
    } = config;

    // Run with original code
    const test1 = createTest({
        name: `${name}-original`,
        url,
        data,
        fetcher,
        code: codeOriginal
    });
    const result1 = await runTest(test1);

    // Run with modified code
    const test2 = createTest({
        name: `${name}-modified`,
        url,
        data,
        fetcher,
        code: codeModified
    });
    const result2 = await runTest(test2);

    // Compare
    const comparison = compareResults(result1, result2);

    // Trace causality
    const causality = traceCausality(comparison, result1, result2);

    return {
        original: result1,
        modified: result2,
        comparison,
        causality,
        report: generateReport(comparison, causality)
    };
}

/**
 * Generate human-readable report
 */
function generateReport(comparison, causality) {
    let report = [];

    report.push('=== DIFF REPORT ===\n');

    // Data diff
    if (comparison.data.type === 'changed') {
        report.push('DATA CHANGES:');
        report.push(formatDiff(comparison.data, 1));
        report.push('');
    } else {
        report.push('DATA: unchanged\n');
    }

    // Chart diff
    if (comparison.chart.type === 'changed') {
        report.push('CHART CHANGES:');
        report.push(formatDiff(comparison.chart, 1));
        report.push('');
    } else {
        report.push('CHART: unchanged\n');
    }

    // Graph diff
    if (comparison.graph.type === 'changed') {
        report.push('GRAPH CHANGES:');
        const g = comparison.graph;
        if (g.nodes.added.length > 0) {
            report.push(`  Nodes added: ${g.nodes.added.join(', ')}`);
        }
        if (g.nodes.removed.length > 0) {
            report.push(`  Nodes removed: ${g.nodes.removed.join(', ')}`);
        }
        if (g.edges.added.length > 0) {
            report.push(`  Edges added: ${g.edges.added.map(e => `${e.from}→${e.to}`).join(', ')}`);
        }
        if (g.edges.removed.length > 0) {
            report.push(`  Edges removed: ${g.edges.removed.map(e => `${e.from}→${e.to}`).join(', ')}`);
        }
        report.push('');
    } else {
        report.push('GRAPH: unchanged\n');
    }

    // Blocks diff
    if (comparison.blocks.type === 'changed') {
        report.push('BLOCK CHANGES:');
        for (let [blockName, change] of Object.entries(comparison.blocks.changes)) {
            report.push(`  ${blockName}: ${change.type}`);
            if (change.stateDiff) {
                report.push(formatDiff(change.stateDiff, 2));
            }
        }
        report.push('');
    } else {
        report.push('BLOCKS: unchanged\n');
    }

    // Causality traces
    if (causality.length > 0) {
        report.push('CAUSALITY TRACES:');
        for (let trace of causality) {
            report.push(`  ${trace.chartVariable} changed:`);
            report.push(`    ${JSON.stringify(trace.change.before)} → ${JSON.stringify(trace.change.after)}`);
            if (trace.affectedBy.length > 0) {
                report.push(`    Affected by:`);
                for (let dep of trace.affectedBy) {
                    report.push(`      - ${dep.node}`);
                }
            }
        }
        report.push('');
    }

    return report.join('\n');
}

export {
    createTest,
    runTest,
    compareResults,
    traceCausality,
    runTestSuite,
    diffDrivenTest,
    generateReport
};
