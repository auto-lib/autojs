/**
 * Test 002: URL Parsing
 *
 * Tests that URL parameters are correctly parsed into state:
 * - dataset parameter
 * - currency parameter (with default)
 * - start/end parameters
 */

export const description = 'URL parsing into state';

export function test(createChart, mockFetcher, assert) {
    let chart = createChart({ fetcher: mockFetcher });

    // Set URL with various parameters
    chart.setUrl('?dataset=brent&currency=EUR&start=2024-01&end=2024-12');

    // Chart should now be ready
    assert.equal(chart.isReady(), true, 'Chart should be ready after setUrl');

    // Check parsed values
    assert.equal(chart.getDataset(), 'brent', 'Dataset should be parsed');
    assert.equal(chart.getCurrency(), 'EUR', 'Currency should be parsed');

    let range = chart.getDateRange();
    assert.equal(range.start, '2024-01', 'Start date should be parsed');
    assert.equal(range.end, '2024-12', 'End date should be parsed');
}

export function testDefaults(createChart, mockFetcher, assert) {
    let chart = createChart({ fetcher: mockFetcher });

    // Set URL with minimal parameters
    chart.setUrl('?dataset=brent');

    // Currency should default to USD
    assert.equal(chart.getCurrency(), 'USD', 'Currency should default to USD');
}

export const expected = {
    parsed: {
        dataset: 'brent',
        currency: 'EUR',
        start: '2024-01',
        end: '2024-12'
    },
    defaults: {
        currency: 'USD'
    }
};
