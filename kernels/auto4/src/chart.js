/**
 * Chart - The central abstraction for Auto4
 *
 * Every time you initialize state, you're really initializing a Chart.
 * This file defines the Chart API that ties together blocks, tracing,
 * and URL-centric state management.
 *
 * STATUS: Placeholder - API defined, implementation TODO
 */

import { createKernel } from './kernel.js';
import { graphHandlers } from './graph.js';
import { createBlock, autoWire, runAll } from './block.js';
import { createTracer } from './tracer.js';

// Block definitions
const urlParserBlock = {
    name: 'urlParser',
    needs: ['rawUrl'],
    gives: ['dataset', 'currency', 'frequency', 'start', 'end', 'compare'],
    state: {
        rawUrl: null,
        dataset: ($) => {
            if (!$.rawUrl) return null;
            const params = new URLSearchParams($.rawUrl.replace(/^\?/, ''));
            return params.get('dataset');
        },
        currency: ($) => {
            if (!$.rawUrl) return 'USD';
            const params = new URLSearchParams($.rawUrl.replace(/^\?/, ''));
            return params.get('currency') || 'USD';
        },
        frequency: ($) => {
            if (!$.rawUrl) return 'daily';
            const params = new URLSearchParams($.rawUrl.replace(/^\?/, ''));
            return params.get('convert') || params.get('frequency') || 'daily';
        },
        start: ($) => {
            if (!$.rawUrl) return null;
            const params = new URLSearchParams($.rawUrl.replace(/^\?/, ''));
            return params.get('start') || params.get('start_date');
        },
        end: ($) => {
            if (!$.rawUrl) return null;
            const params = new URLSearchParams($.rawUrl.replace(/^\?/, ''));
            return params.get('end') || params.get('end_date');
        },
        compare: ($) => {
            if (!$.rawUrl) return [];
            const params = new URLSearchParams($.rawUrl.replace(/^\?/, ''));
            const compare = params.get('compare');
            return compare ? compare.split(',') : [];
        }
    }
};

const dataFetcherBlock = {
    name: 'dataFetcher',
    needs: ['dataset'],
    gives: ['rawData', 'loading', 'error'],
    // fetcher is injected during init
    state: {
        dataset: null,
        rawData: null,
        loading: false,
        error: null
    }
};

const dataProcessorBlock = {
    name: 'dataProcessor',
    needs: ['rawData', 'currency', 'frequency', 'start', 'end'],
    gives: ['processedData'],
    state: {
        rawData: null,
        currency: 'USD',
        frequency: 'daily',
        start: null,
        end: null,
        processedData: ($) => {
            if (!$.rawData) return null;
            // TODO: Implement transformation pipeline
            // 1. Currency conversion
            // 2. Frequency adjustment
            // 3. Date range filtering
            return $.rawData;
        }
    }
};

const chartRendererBlock = {
    name: 'chartRenderer',
    needs: ['processedData'],
    gives: ['lines', 'labels', 'dates', 'scales'],
    state: {
        processedData: null,
        lines: ($) => {
            if (!$.processedData) return [];
            // TODO: Compute chart lines
            return [{
                id: $.processedData.id,
                values: $.processedData.prices,
                dates: $.processedData.dates
            }];
        },
        labels: ($) => {
            if (!$.processedData) return [];
            return [$.processedData.id];
        },
        dates: ($) => {
            if (!$.processedData) return [];
            return $.processedData.dates;
        },
        scales: ($) => {
            // TODO: Compute scales
            return null;
        }
    }
};

const urlStateBlock = {
    name: 'urlState',
    needs: ['dataset', 'currency', 'frequency', 'start', 'end'],
    gives: ['url'],
    state: {
        dataset: null,
        currency: 'USD',
        frequency: 'daily',
        start: null,
        end: null,
        url: ($) => {
            if (!$.dataset) return null;
            const params = new URLSearchParams();
            params.set('dataset', $.dataset);
            if ($.currency && $.currency !== 'USD') {
                params.set('currency', $.currency);
            }
            if ($.frequency && $.frequency !== 'daily') {
                params.set('convert', $.frequency);
            }
            if ($.start) params.set('start', $.start);
            if ($.end) params.set('end', $.end);
            return '?' + params.toString();
        }
    }
};

/**
 * Create a new Chart instance
 *
 * @param {Object} options
 * @param {Object} options.fetcher - Data fetcher implementation
 * @param {boolean} options.tracer - Enable tracing (default: false)
 * @param {Function} options.onBlockOutput - Callback for block outputs
 * @returns {Chart}
 */
export function createChart(options = {}) {
    const { fetcher, tracer: enableTracer = false, onBlockOutput } = options;

    if (!fetcher) {
        throw new Error('createChart requires a fetcher option');
    }

    // Internal state
    let _ready = false;
    let _rawUrl = null;
    let _tracer = enableTracer ? createTracer() : null;
    let _lastTrace = null;

    // Create blocks
    // TODO: Initialize blocks properly with kernel
    const blocks = {
        urlParser: { ...urlParserBlock },
        dataFetcher: { ...dataFetcherBlock, fetcher },
        dataProcessor: { ...dataProcessorBlock },
        chartRenderer: { ...chartRendererBlock },
        urlState: { ...urlStateBlock }
    };

    // The Chart API
    const chart = {
        // ============ Configuration ============

        setUrl(urlString) {
            _rawUrl = urlString;
            // TODO: Parse URL and update all blocks
            // TODO: Trigger data fetch
            // TODO: Record trace
            _ready = true; // Placeholder
            throw new Error('setUrl not yet implemented');
        },

        getUrl() {
            // TODO: Return current URL from urlState block
            throw new Error('getUrl not yet implemented');
        },

        setDataset(datasetId) {
            // TODO: Update dataset and trigger fetch
            throw new Error('setDataset not yet implemented');
        },

        setCurrency(currency) {
            // TODO: Update currency and trigger reconversion
            throw new Error('setCurrency not yet implemented');
        },

        setFrequency(frequency) {
            // TODO: Update frequency and trigger reprocessing
            throw new Error('setFrequency not yet implemented');
        },

        setDateRange(start, end) {
            // TODO: Update date range and trigger filtering
            throw new Error('setDateRange not yet implemented');
        },

        // ============ Data Access ============

        getData() {
            if (!_ready) {
                throw new Error('URL not set');
            }
            // TODO: Return { lines, labels, dates } from chartRenderer
            throw new Error('getData not yet implemented');
        },

        getDataset() {
            // TODO: Return current dataset from urlParser
            throw new Error('getDataset not yet implemented');
        },

        getCurrency() {
            // TODO: Return current currency
            throw new Error('getCurrency not yet implemented');
        },

        getFrequency() {
            // TODO: Return current frequency
            throw new Error('getFrequency not yet implemented');
        },

        getDateRange() {
            // TODO: Return { start, end }
            throw new Error('getDateRange not yet implemented');
        },

        getRawData() {
            // TODO: Return raw fetched data
            throw new Error('getRawData not yet implemented');
        },

        // ============ State Queries ============

        isReady() {
            return _ready;
        },

        isLoading() {
            // TODO: Return loading state from dataFetcher
            return false;
        },

        hasError() {
            // TODO: Return error state
            return false;
        },

        getError() {
            // TODO: Return error details
            return null;
        },

        // Async helper - wait for data
        async whenReady() {
            // TODO: Wait for all async operations to complete
            return Promise.resolve();
        },

        // ============ Tracing ============

        getTrace() {
            return _lastTrace;
        },

        getTraces() {
            return _tracer ? _tracer.getRuns() : [];
        },

        clearTraces() {
            _lastTrace = null;
            if (_tracer) {
                // TODO: Clear tracer runs
            }
        },

        // ============ Components ============

        get components() {
            return {
                urlParser: {
                    state: blocks.urlParser.state
                },
                dataFetcher: {
                    state: blocks.dataFetcher.state
                },
                dataProcessor: {
                    state: blocks.dataProcessor.state
                },
                chartRenderer: {
                    state: blocks.chartRenderer.state
                },
                urlState: {
                    state: blocks.urlState.state
                }
            };
        },

        getBlocks() {
            return {
                urlParser: {
                    needs: urlParserBlock.needs,
                    gives: urlParserBlock.gives
                },
                dataFetcher: {
                    needs: dataFetcherBlock.needs,
                    gives: dataFetcherBlock.gives
                },
                dataProcessor: {
                    needs: dataProcessorBlock.needs,
                    gives: dataProcessorBlock.gives
                },
                chartRenderer: {
                    needs: chartRendererBlock.needs,
                    gives: chartRendererBlock.gives
                },
                urlState: {
                    needs: urlStateBlock.needs,
                    gives: urlStateBlock.gives
                }
            };
        },

        // ============ Svelte Integration ============

        // The ['#'] accessor for Svelte stores
        get ['#']() {
            // TODO: Return store wrappers for each state value
            throw new Error('Svelte store access not yet implemented');
        }
    };

    return chart;
}

export default createChart;
