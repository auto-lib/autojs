module.exports = {
    obj: {
        data: null,
        a: ($) => $.b,
        b: ($) => $.c,
        c: ($) => $.data ? $.a : 0
    },
    fn: ($) => {
        $.data = true;
        $.a;
    },
    _: {
        fn: ['a','b','c'],
        subs: [],
        deps: { a: { }, b: { }, c: { data: true } },
        value: { data: true, a: undefined, b: undefined, c: undefined },
        fatal: {
            msg: 'circular dependency',
            stack: [ 'a', 'b', 'c', 'a' ]
        }
    }
}