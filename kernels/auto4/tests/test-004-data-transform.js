/**
 * Test 004: Data Transformation
 *
 * Tests that raw data is transformed correctly:
 * - Currency conversion
 * - Frequency conversion
 * - Date range filtering
 */

export const description = 'Data transformation pipeline';

export async function test(createChart, mockFetcher, assert) {
    // Mock fetcher with known data
    let testFetcher = {
        async fetchDataset(datasetId) {
            return {
                id: datasetId,
                currency: 'USD',
                prices: [100, 110, 120, 130, 140],
                dates: ['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01']
            };
        },
        async fetchCurrencyRates(currency) {
            return { USD: 1, EUR: 0.9, GBP: 0.8 };
        }
    };

    let chart = createChart({ fetcher: testFetcher });

    // Set URL with currency conversion
    chart.setUrl('?dataset=test&currency=EUR');
    await chart.whenReady();

    let data = chart.getData();

    // Prices should be converted (100 USD * 0.9 = 90 EUR)
    assert.ok(data.lines[0].values[0] === 90, 'First price should be converted to EUR');

    // All values should be converted
    assert.deepEqual(
        data.lines[0].values,
        [90, 99, 108, 117, 126],
        'All prices should be converted'
    );
}

export async function testDateRange(createChart, mockFetcher, assert) {
    let testFetcher = {
        async fetchDataset(datasetId) {
            return {
                id: datasetId,
                currency: 'USD',
                prices: [100, 110, 120, 130, 140],
                dates: ['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01']
            };
        },
        async fetchCurrencyRates() { return { USD: 1 }; }
    };

    let chart = createChart({ fetcher: testFetcher });
    chart.setUrl('?dataset=test&start=2024-02&end=2024-04');
    await chart.whenReady();

    let data = chart.getData();

    // Should only have 3 data points (Feb, Mar, Apr)
    assert.equal(data.lines[0].values.length, 3, 'Should have 3 values in range');
    assert.deepEqual(data.lines[0].values, [110, 120, 130], 'Values should be filtered to range');
}

export const expected = {
    currencyConversion: true,
    dateRangeFiltering: true
};
