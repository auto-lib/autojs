/**
 * Test 008: Component Access
 *
 * Tests accessing individual chart components:
 * - Components are accessible
 * - Each component has its own state
 * - Components can be inspected independently
 */

export const description = 'Component access and inspection';

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

    let chart = createChart({ fetcher: testFetcher });
    chart.setUrl('?dataset=brent&currency=EUR');
    await chart.whenReady();

    // Get components
    let components = chart.components;

    // Components should exist
    assert.ok(components, 'Components should be accessible');
    assert.ok(components.urlParser, 'URL parser component should exist');
    assert.ok(components.dataFetcher, 'Data fetcher component should exist');
    assert.ok(components.dataProcessor, 'Data processor component should exist');
    assert.ok(components.chartRenderer, 'Chart renderer component should exist');

    // Each component should have state
    assert.ok(components.urlParser.state, 'URL parser should have state');
    assert.equal(components.urlParser.state.dataset, 'brent', 'URL parser state should have dataset');
    assert.equal(components.urlParser.state.currency, 'EUR', 'URL parser state should have currency');

    // Processor should have converted data
    assert.ok(components.dataProcessor.state.processedData, 'Processor should have processed data');

    // Renderer should have lines
    assert.ok(components.chartRenderer.state.lines, 'Renderer should have lines');
}

export async function testComponentIndependence(createChart, mockFetcher, assert) {
    let testFetcher = {
        async fetchDataset(datasetId) {
            return { id: datasetId, prices: [100], dates: ['2024-01'] };
        },
        async fetchCurrencyRates() { return { USD: 1 }; }
    };

    let chart = createChart({ fetcher: testFetcher });
    chart.setUrl('?dataset=test');
    await chart.whenReady();

    // Modifying component state directly should NOT affect chart
    // (components should be read-only views)
    let originalDataset = chart.getDataset();

    // This should either throw or be ignored
    try {
        chart.components.urlParser.state.dataset = 'hacked';
    } catch (e) {
        // Expected - components are read-only
    }

    // Chart dataset should be unchanged
    assert.equal(chart.getDataset(), originalDataset, 'Chart state should be protected');
}

export const expected = {
    componentsAccessible: true,
    componentStateReadable: true,
    componentStateProtected: true
};
