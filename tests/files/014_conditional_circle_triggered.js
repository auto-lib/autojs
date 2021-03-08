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
        deps: { a: [], b: ['c'], c: ['data', 'a'] },
        value: { data: true, a: 0, b: 0, c: 0 },
        fatal: {
            source: 'run',
            msg: 'circular dependency',
            stack: [ 'a', 'b', 'c', 'a' ]
        }
    }
}