// devlog/docs/027_out_of_order_deps.md

export default {
    obj: {
        data: [1,2,3],
        func: (_) => _.more.length + 1,
        more: (_) => _.data.map(d => d+1)
    },
    fn: ($) => {},
    _: {
        fn: [ 'func', 'more' ],
        deps: { func: { more: true }, more: { data: true } },
        subs: { },
        value: { data: [1,2,3], func: 4, more: [2,3,4] },
        fatal: { }
    }
}