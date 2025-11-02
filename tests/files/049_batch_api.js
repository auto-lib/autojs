// Test batch API - multiple sets in one transaction

let _trace = [];
let put_trace = v => _trace.push(v);

export default {
    obj: {
        data: null,
        filter: null,
        page: 1,

        count: ($) => $.data ? $.data.length : 0,
        filtered: ($) => {
            if (!$.data || !$.filter) return null;
            return $.data.filter(x => x.includes($.filter));
        },
        filtered_count: ($) => $.filtered ? $.filtered.length : 0,
        result: ($) => {
            return {
                page: $.page,
                count: $.filtered_count,
                items: $.filtered
            };
        },

        '#fatal': () => {}
    },
    fn: ($, global) => {
        // Three separate sets - should create THREE transactions
        $.data = ['apple', 'banana', 'apricot'];
        $.filter = 'ap';
        $.page = 1;

        global.separate_txn_count = _trace.length;

        _trace = []; // reset

        // Batch - should create ONE transaction with THREE triggers
        $.batch(() => {
            $.data = ['apple', 'banana', 'apricot', 'avocado'];
            $.filter = 'av';
            $.page = 2;
        });

        global.batch_txn_count = _trace.length;
        global.batch_trigger_count = _trace[0].triggers.length;
        global.batch_trigger_names = _trace[0].triggers.map(t => t.name).sort();
        global.final_result = $.result;
    },
    opt: {
        auto_batch: false,
        trace: v => put_trace(v)
    },
    _: {
        fn: ['count', 'filtered', 'filtered_count', 'result'],
        deps: {
            count: { data: true },
            filtered: { data: true, filter: true },
            filtered_count: { filtered: true },
            result: { page: true, filtered_count: true, filtered: true }
        },
        subs: {},
        value: {
            data: ['apple', 'banana', 'apricot', 'avocado'],
            filter: 'av',
            page: 2,
            count: 4,
            filtered: ['avocado'],
            filtered_count: 1,
            result: {
                page: 2,
                count: 1,
                items: ['avocado']
            }
        },
        fatal: {}
    },
    global: {
        separate_txn_count: 2,  // Two changes (data, filter) - page=1 is no change
        batch_txn_count: 1,      // One batch call = 1 transaction
        batch_trigger_count: 3,  // But 3 triggers in that transaction
        batch_trigger_names: ['data', 'filter', 'page'],
        final_result: {
            page: 2,
            count: 1,
            items: ['avocado']
        }
    }
}
