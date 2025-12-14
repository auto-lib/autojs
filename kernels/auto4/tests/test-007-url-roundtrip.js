/**
 * Test 007: URL Round-Trip
 *
 * Critical test: Setting the URL to the current state should produce no changes.
 * This validates:
 * - URL generation correctly reflects state
 * - URL parsing correctly sets state
 * - No spurious recomputations
 */

export const description = 'URL round-trip produces no changes';

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
        async fetchCurrencyRates() { return { USD: 1, EUR: 0.9 }; }
    };

    // Create chart with tracing
    let chart = createChart({ fetcher: testFetcher, tracer: true });

    // Set initial URL
    chart.setUrl('?dataset=brent&currency=USD&start=2024-01&end=2024-03');
    await chart.whenReady();

    // Make a change
    chart.setCurrency('EUR');
    await chart.whenReady();

    // Get the current URL (reflects EUR currency)
    let currentUrl = chart.getUrl();
    assert.ok(currentUrl.includes('currency=EUR'), 'URL should reflect EUR');

    // Clear traces
    chart.clearTraces();

    // Set the exact same URL
    chart.setUrl(currentUrl);
    await chart.whenReady();

    // Get trace
    let trace = chart.getTrace();

    // Trace should have no meaningful changes
    // (there might be a trigger, but steps should be empty or only have no-op entries)
    let meaningfulSteps = trace.steps.filter(s => s.from !== s.to);
    assert.deepEqual(meaningfulSteps, [], 'No values should have changed');
}

export async function testMultipleParameters(createChart, mockFetcher, assert) {
    let testFetcher = {
        async fetchDataset(datasetId) {
            return { id: datasetId, prices: [100], dates: ['2024-01'] };
        },
        async fetchCurrencyRates() { return { USD: 1, EUR: 0.9, GBP: 0.8 }; }
    };

    let chart = createChart({ fetcher: testFetcher, tracer: true });

    // Complex initial state
    chart.setUrl('?dataset=wti&currency=GBP&start=2024-01&end=2024-06&compare=brent');
    await chart.whenReady();

    // Make multiple changes
    chart.setCurrency('EUR');
    chart.setDateRange('2024-02', '2024-05');
    await chart.whenReady();

    // Get and re-apply URL
    let url = chart.getUrl();
    chart.clearTraces();
    chart.setUrl(url);
    await chart.whenReady();

    let trace = chart.getTrace();
    let meaningfulSteps = trace.steps.filter(s => s.from !== s.to);
    assert.deepEqual(meaningfulSteps, [], 'Complex state round-trip should have no changes');
}

export const expected = {
    simpleRoundTrip: 'no changes',
    complexRoundTrip: 'no changes'
};
