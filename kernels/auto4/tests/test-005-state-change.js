/**
 * Test 005: State Changes
 *
 * Tests that state changes propagate correctly:
 * - Setting currency triggers reconversion
 * - Setting date range filters data
 * - URL updates to reflect state
 */

export const description = 'State changes and propagation';

export async function test(createChart, mockFetcher, assert) {
    let testFetcher = {
        async fetchDataset(datasetId) {
            return {
                id: datasetId,
                currency: 'USD',
                prices: [100, 110, 120],
                dates: ['2024-01-01', '2024-02-01', '2024-03-01']
            };
        },
        async fetchCurrencyRates() { return { USD: 1, EUR: 0.9 }; }
    };

    let chart = createChart({ fetcher: testFetcher });
    chart.setUrl('?dataset=test&currency=USD');
    await chart.whenReady();

    // Initial state
    let data1 = chart.getData();
    assert.deepEqual(data1.lines[0].values, [100, 110, 120], 'Initial values in USD');

    // Change currency
    chart.setCurrency('EUR');
    await chart.whenReady();

    // Data should be reconverted
    let data2 = chart.getData();
    assert.deepEqual(data2.lines[0].values, [90, 99, 108], 'Values should be converted to EUR');

    // URL should reflect change
    let url = chart.getUrl();
    assert.ok(url.includes('currency=EUR'), 'URL should include new currency');
}

export async function testDateRangeChange(createChart, mockFetcher, assert) {
    let testFetcher = {
        async fetchDataset(datasetId) {
            return {
                id: datasetId,
                prices: [100, 110, 120, 130, 140],
                dates: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05']
            };
        },
        async fetchCurrencyRates() { return { USD: 1 }; }
    };

    let chart = createChart({ fetcher: testFetcher });
    chart.setUrl('?dataset=test');
    await chart.whenReady();

    // Initial: all data
    let data1 = chart.getData();
    assert.equal(data1.lines[0].values.length, 5, 'Initial: all 5 values');

    // Change date range
    chart.setDateRange('2024-02', '2024-04');
    await chart.whenReady();

    let data2 = chart.getData();
    assert.equal(data2.lines[0].values.length, 3, 'After range: 3 values');

    // URL should reflect change
    let url = chart.getUrl();
    assert.ok(url.includes('start=2024-02'), 'URL should include start date');
    assert.ok(url.includes('end=2024-04'), 'URL should include end date');
}

export const expected = {
    currencyChangePropagates: true,
    dateRangeChangePropagates: true,
    urlUpdates: true
};
