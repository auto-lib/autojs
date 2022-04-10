// devlog/docs/027_out_of_order_deps.md

module.exports = {
    obj: {
        data: [1,2,3],
        func: (_) => _.size + 1,
        size: (_) => _.data ? _.data.length : 0
    },
    fn: ($) => {},
    _: {
        fn: [ 'func', 'size' ],
        deps: { func: ['size'], size: ['data'] },
        subs: { },
        value: { data: [1,2,3], func: 4, size: 3 },
        fatal: { }
    }
}