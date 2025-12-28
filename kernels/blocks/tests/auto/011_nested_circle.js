// Test: Circular through three nodes (a -> b -> c -> a)

export default {
    obj: {
        a: ($) => $.b,
        b: ($) => $.c,
        c: ($) => $.a
    },
    fn: ($) => {},
    _: {
        fn: ['a', 'b', 'c'],
        deps: {
            a: { b: true },
            b: { c: true },
            c: { a: true }
        },
        value: {},
        stale: ['a', 'b', 'c'],
        fatal: {
            msg: 'Cycle detected involving: a',
            stack: ['a', 'b', 'c', 'a']
        }
    }
};
