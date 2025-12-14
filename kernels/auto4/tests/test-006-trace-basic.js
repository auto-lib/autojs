/**
 * Test 006: Basic Tracing
 *
 * Tests that state changes produce traces:
 * - Trace records the trigger
 * - Trace shows affected variables
 * - Trace captures before/after values
 */

export const description = 'Basic execution tracing';

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

    // Create chart with tracing enabled
    let chart = createChart({ fetcher: testFetcher, tracer: true });
    chart.setUrl('?dataset=test&currency=USD');
    await chart.whenReady();

    // Clear any setup traces
    chart.clearTraces();

    // Make a change
    chart.setCurrency('EUR');
    await chart.whenReady();

    // Get the trace
    let trace = chart.getTrace();

    // Trace should exist
    assert.ok(trace, 'Trace should exist');

    // Trigger should be recorded
    assert.ok(trace.trigger, 'Trace should have trigger');
    assert.equal(trace.trigger.type, 'setCurrency', 'Trigger type should be setCurrency');
    assert.equal(trace.trigger.value, 'EUR', 'Trigger value should be EUR');

    // Steps should show what changed
    assert.ok(trace.steps.length > 0, 'Trace should have steps');

    // Should include currency change
    let currencyStep = trace.steps.find(s => s.key === 'currency');
    assert.ok(currencyStep, 'Should have currency step');
    assert.equal(currencyStep.from, 'USD', 'Currency from value');
    assert.equal(currencyStep.to, 'EUR', 'Currency to value');

    // Should include downstream effects
    let hasDataChange = trace.steps.some(s =>
        s.key === 'convertedPrices' ||
        s.key === 'processedData' ||
        s.key === 'lines'
    );
    assert.ok(hasDataChange, 'Should show downstream data effects');
}

export const expected = {
    traceExists: true,
    triggerRecorded: true,
    stepsRecorded: true,
    beforeAfterCaptured: true
};
