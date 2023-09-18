// devlog/docs/027_out_of_order_deps.md

export default {
    obj: {
        data: [1,2,3],
        func: (_) => _.size + 1,
        size: (_) => _.data ? _.data.length : 0
    },
    fn: ($) => {},
    _: {
        fn: [ 'func', 'size' ],
        deps: { func: { size: true }, size: { data: true } },
        subs: { },
        value: { data: [1,2,3], func: 4, size: 3 },
        fatal: { }
    }
}