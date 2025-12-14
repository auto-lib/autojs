/**
 * Test 010: Cross-Block Tracing
 *
 * Tests tracing across multiple blocks:
 * - Trace shows which blocks were affected
 * - Trace shows data flow between blocks
 * - Can identify root cause of downstream changes
 */

export const description = 'Cross-block execution tracing';

export async function test(createChart, mockFetcher, assert) {
    let testFetcher = {
        async fetchDataset(datasetId) {
            return {
                id: datasetId,
                currency: 'USD',
                prices: [100, 110, 120],
                dates: ['2024-01', '2024-02', '2024-03']
            };
        },
        async fetchCurrencyRates() { return { USD: 1, EUR: 0.9, GBP: 0.8 }; }
    };

    let chart = createChart({ fetcher: testFetcher, tracer: true });
    chart.setUrl('?dataset=test&currency=USD');
    await chart.whenReady();

    // Clear setup traces
    chart.clearTraces();

    // Change currency - should affect multiple blocks
    chart.setCurrency('EUR');
    await chart.whenReady();

    let trace = chart.getTrace();

    // Trace should show cross-block effects
    let blocksAffected = new Set(trace.steps.map(s => s.block));

    // Config/urlParser block should be affected (currency changed)
    assert.ok(
        blocksAffected.has('urlParser') || blocksAffected.has('config'),
        'URL/config block should be affected'
    );

    // Processor block should be affected (needs to reconvert)
    assert.ok(blocksAffected.has('dataProcessor'), 'Data processor should be affected');

    // Renderer block should be affected (lines change)
    assert.ok(blocksAffected.has('chartRenderer'), 'Chart renderer should be affected');

    // URL state should be affected (URL updates)
    assert.ok(
        blocksAffected.has('urlState') || trace.steps.some(s => s.key === 'url'),
        'URL should be updated'
    );
}

export async function testTraceCausality(createChart, mockFetcher, assert) {
    let testFetcher = {
        async fetchDataset(datasetId) {
            return {
                id: datasetId,
                currency: 'USD',
                prices: [100, 110, 120],
                dates: ['2024-01', '2024-02', '2024-03']
            };
        },
        async fetchCurrencyRates() { return { USD: 1, EUR: 0.9 }; }
    };

    let chart = createChart({ fetcher: testFetcher, tracer: true });
    chart.setUrl('?dataset=test');
    await chart.whenReady();
    chart.clearTraces();

    // Change date range
    chart.setDateRange('2024-02', '2024-03');
    await chart.whenReady();

    let trace = chart.getTrace();

    // Should be able to trace from trigger to final effect
    // Trigger: setDateRange -> urlParser updates start/end
    //   -> dataProcessor filters data
    //   -> chartRenderer updates lines
    //   -> urlState updates URL

    // Verify we can see the causal chain
    let startStep = trace.steps.find(s => s.key === 'start');
    let endStep = trace.steps.find(s => s.key === 'end');
    let dataStep = trace.steps.find(s =>
        s.key === 'processedData' ||
        s.key === 'filteredData' ||
        s.recomputed
    );

    assert.ok(startStep || endStep, 'Date range change should be visible');
    assert.ok(dataStep, 'Data recomputation should be visible');

    // Verify ordering in trace (cause before effect)
    if (startStep && dataStep) {
        let startIdx = trace.steps.indexOf(startStep);
        let dataIdx = trace.steps.indexOf(dataStep);
        assert.ok(startIdx < dataIdx, 'Cause (date change) should come before effect (data change)');
    }
}

export const expected = {
    crossBlockTracing: true,
    causalityVisible: true,
    allAffectedBlocksShown: true
};
