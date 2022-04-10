// devlog/docs/027_out_of_order_deps.md

module.exports = {
    obj: {
        data: [1,2,3],
        func: (_) => _.size + 1,
    },
    fn: ($) => {},
    _: {
        fn: [ 'func' ],
        deps: { },
        subs: { },
        value: { data: [1,2,3], func: NaN },
        fatal: { 
            msg: 'function func is trying to access non-existent variable size',
            stack: [ 'func' ]
        }
    }
}