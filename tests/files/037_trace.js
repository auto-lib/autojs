// devlog/docs/028_complete_leaves.md

let _trace = [];
let get_trace = () => _trace;
let put_trace = v => _trace.push(v);

export default {
    obj: {
        data: [1,2,3],
        combine: (_) => _.data.length + _.func_1 + _.func_2,
        func_1: (_) => _.data.length,
        func_2: (_) => _.data.length + 10,
    },
    fn: ($, global) => {
        $.data = [1,2,3,4];
        $.data = [2,3,4];

        // Extract just what we need to check from traces
        let traces = get_trace();
        global.trace_count = traces.length;
        global.first_trigger_name = traces[0].triggers[0].name;
        global.first_trigger_value = traces[0].triggers[0].value;
        global.first_updates = traces[0].updates;
        global.second_trigger_name = traces[1].triggers[0].name;
        global.second_trigger_value = traces[1].triggers[0].value;
        global.second_updates = traces[1].updates;
        global.has_ids = typeof traces[0].id === 'number' && typeof traces[1].id === 'number';
        global.has_timestamps = typeof traces[0].timestamp === 'number' && typeof traces[1].timestamp === 'number';
    },
    opt: {
        trace: v => put_trace(v)
    },
    _: {
        fn: [ 'func_1', 'func_2', 'combine' ],
        deps: { 
            func_1: { data: true }, 
            func_2: { data: true }, 
            combine: { func_1: true, func_2: true, data: true } },
        subs: { },
        value: { data: [2,3,4], func_1: 3, func_2: 13, combine: 19 },
        fatal: { }
    },
    global: {
        trace_count: 2,
        first_trigger_name: 'data',
        first_trigger_value: [1,2,3,4],
        first_updates: {
            func_1: 4,
            func_2: 14,
            combine: 22
        },
        second_trigger_name: 'data',
        second_trigger_value: [2,3,4],
        second_updates: {
            func_1: 3,
            func_2: 13,
            combine: 19
        },
        has_ids: true,
        has_timestamps: true
    }
}