/**
 * Test 009: Block Architecture
 *
 * Tests the underlying block-based architecture:
 * - Blocks have needs and gives
 * - Blocks are wired together
 * - Data flows through blocks
 */

export const description = 'Block needs/gives and wiring';

export async function test(createChart, mockFetcher, assert) {
    let testFetcher = {
        async fetchDataset(datasetId) {
            return {
                id: datasetId,
                currency: 'USD',
                prices: [100, 110],
                dates: ['2024-01', '2024-02']
            };
        },
        async fetchCurrencyRates() { return { USD: 1, EUR: 0.9 }; }
    };

    let chart = createChart({ fetcher: testFetcher });
    chart.setUrl('?dataset=test');
    await chart.whenReady();

    // Get block definitions
    let blocks = chart.getBlocks();

    // Verify block structure
    assert.ok(blocks.urlParser, 'urlParser block should exist');
    assert.ok(blocks.dataFetcher, 'dataFetcher block should exist');
    assert.ok(blocks.dataProcessor, 'dataProcessor block should exist');
    assert.ok(blocks.chartRenderer, 'chartRenderer block should exist');

    // Verify needs/gives
    assert.ok(blocks.urlParser.gives.includes('dataset'), 'urlParser should give dataset');
    assert.ok(blocks.dataFetcher.needs.includes('dataset'), 'dataFetcher should need dataset');
    assert.ok(blocks.dataProcessor.needs.includes('rawData'), 'dataProcessor should need rawData');
    assert.ok(blocks.dataFetcher.gives.includes('rawData'), 'dataFetcher should give rawData');
}

export async function testBlockDataFlow(createChart, mockFetcher, assert) {
    let flowLog = [];

    let testFetcher = {
        async fetchDataset(datasetId) {
            flowLog.push(`fetch:${datasetId}`);
            return { id: datasetId, prices: [100], dates: ['2024-01'] };
        },
        async fetchCurrencyRates() { return { USD: 1 }; }
    };

    // Create chart with block logging
    let chart = createChart({
        fetcher: testFetcher,
        onBlockOutput: (blockName, key, value) => {
            flowLog.push(`${blockName}:${key}`);
        }
    });

    chart.setUrl('?dataset=test');
    await chart.whenReady();

    // Data should have flowed through blocks in order
    // urlParser -> dataFetcher -> dataProcessor -> chartRenderer
    assert.ok(flowLog.includes('urlParser:dataset'), 'URL parser should emit dataset');
    assert.ok(flowLog.includes('fetch:test'), 'Fetcher should fetch test dataset');

    // Verify order
    let datasetIdx = flowLog.findIndex(s => s.includes('urlParser:dataset'));
    let fetchIdx = flowLog.findIndex(s => s.includes('fetch:'));
    assert.ok(datasetIdx < fetchIdx, 'URL parse should happen before fetch');
}

export const expected = {
    blocksExist: true,
    needsGivesDefined: true,
    dataFlowsCorrectly: true
};
