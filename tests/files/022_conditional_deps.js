
// check if we have a function that uses
// a conditional dependency that it catches
// the second dependency...

export default {
    obj: {
        data1: null,
        data2: null,
        func: ($) => $.data1 ? $.data1.length : ($.data2 ? $.data2.length : 0)
    },
    fn: ($) => {
    },
    _: {
        fn: [ 'func' ],
        subs: [],
        deps: { func: { data1: true, data2: true } },
        value: { data1: null, data2: null, func: 0 },
        fatal: {}
    }
}