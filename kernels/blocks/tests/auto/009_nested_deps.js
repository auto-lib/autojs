// Test: Multi-level dependencies (a -> b -> c)

export default {
    obj: {
        a: 1,
        b: ($) => $.a + 1,
        c: ($) => $.b + 1
    },
    fn: ($) => {},
    _: {
        fn: ['b', 'c'],
        deps: {
            b: { a: true },
            c: { b: true }
        },
        value: { a: 1, b: 2, c: 3 },
        stale: []
    }
};
