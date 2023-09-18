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
        global.trace = get_trace();
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
        trace: [
            {
                name: 'data',
                value: [1,2,3,4],
                result: {
                    func_1: 4,
                    func_2: 14,
                    combine: 22
                }
            },
            {
                name: 'data',
                value: [2,3,4],
                result: {
                    func_1: 3,
                    func_2: 13,
                    combine: 19
                }
            }
        ]
    }
}