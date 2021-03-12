
// what if the conditional dependency is itself a function?
// checking to see if func2 picks up the data2 dependency
// since it has to first check func1... which is a function...

module.exports = {
    obj: {
        data1: null,
        func1: ($) => $.data1 ? $.data1.length : null,
        func2: ($) => $.func1 ? $.func1.length : ($.data2 ? $.data2.length : 0),
        data2: null,
    },
    fn: ($) => {
    },
    _: {
        fn: [ 'func1', 'func2' ],
        subs: [],
        deps: { func1: ['data1'], func2: ['func1','data2'] },
        value: { data1: null, data2: null, func1: null, func2: 0 },
        fatal: {}
    }
}