module.exports = {
    obj: {
        data: null,
        count: ($) => $.data = 10
    },
    fn: ($) => {},
    _: {
        fn: [ 'count' ],
        subs: [],
        deps: {},
        value: { data: null, count: 10 },
        fatal: {
            msg: "function count is trying to change value data",
            stack: ['count']
        }
    }
}