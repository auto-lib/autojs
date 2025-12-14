/**
 * Test 001: Basic Initialization
 *
 * Tests the most basic chart creation and lifecycle:
 * - Chart can be created
 * - Chart is not ready before URL is set
 * - Attempting to get data before URL throws error
 */

export const description = 'Basic chart initialization and lifecycle';

export function test(createChart, mockFetcher, assert) {
    // Create chart with mock fetcher
    let chart = createChart({ fetcher: mockFetcher });

    // Chart exists
    assert.ok(chart, 'Chart should exist');

    // Not ready before URL set
    assert.equal(chart.isReady(), false, 'Chart should not be ready before URL');

    // getData throws before URL
    let threw = false;
    try {
        chart.getData();
    } catch (e) {
        threw = true;
        assert.ok(e.message.includes('URL'), 'Error should mention URL');
    }
    assert.ok(threw, 'getData should throw before URL is set');
}

export const expected = {
    ready: false,
    error: 'URL not set'
};
