export default {
    obj: {
        a: ($) => $.b,
        b: ($) => $.c,
        c: ($) => $.a,
    },
    fn: ($) => {},
    _: {
        fn: ['a','b','c'],
        subs: [],
        deps: { a: { }, b: { }, c: { } },
        value: { a: undefined, b: undefined, c: undefined },
        fatal: {
            msg: 'circular dependency',
            stack: ['a','b','c','a']
        }
    }
}