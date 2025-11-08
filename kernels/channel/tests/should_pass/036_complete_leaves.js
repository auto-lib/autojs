// devlog/docs/028_complete_leaves.md

module.exports = {
    state: {
        data: [1,2,3],
        combine: (_) => _.data.length + _.func_1 + _.func_2,
        func_1: (_) => _.data.length,
        func_2: (_) => _.data.length + 10,
    },
    fn: ($) => {
        $.data = [1,2,3,4];
    },
    _: {
        fn: [ 'func_1', 'func_2', 'combine' ],
        deps: { 
            func_1: ['data'], 
            func_2: ['data'], 
            combine: ['func_1', 'func_2', 'data'] },
        subs: { },
        cache: { data: [1,2,3,4], func_1: 4, func_2: 14, combine: 22 },
        fatal: { }
    },
}