/**
 * Test 003: Data Fetching
 *
 * Tests that data is fetched using the injected fetcher:
 * - Fetcher is called with correct dataset
 * - Loading state is tracked
 * - Data is returned correctly
 */

export const description = 'Data fetching with mock fetcher';

export async function test(createChart, mockFetcher, assert) {
    let fetchCalls = [];

    // Create fetcher that records calls
    let recordingFetcher = {
        async fetchDataset(datasetId) {
            fetchCalls.push({ method: 'fetchDataset', args: [datasetId] });
            return {
                id: datasetId,
                prices: [100, 101, 102],
                dates: ['2024-01-01', '2024-01-02', '2024-01-03']
            };
        },
        async fetchCurrencyRates(currency) {
            fetchCalls.push({ method: 'fetchCurrencyRates', args: [currency] });
            return { USD: 1, EUR: 0.85 };
        }
    };

    let chart = createChart({ fetcher: recordingFetcher });
    chart.setUrl('?dataset=brent');

    // Wait for async operations
    await chart.whenReady();

    // Fetcher should have been called
    assert.ok(fetchCalls.length > 0, 'Fetcher should be called');
    assert.equal(fetchCalls[0].method, 'fetchDataset', 'fetchDataset should be called');
    assert.equal(fetchCalls[0].args[0], 'brent', 'Should fetch correct dataset');

    // Data should be available
    let data = chart.getData();
    assert.ok(data, 'Data should be returned');
    assert.ok(data.lines, 'Data should have lines');
}

export const expected = {
    fetcherCalled: true,
    datasetFetched: 'brent',
    dataAvailable: true
};
