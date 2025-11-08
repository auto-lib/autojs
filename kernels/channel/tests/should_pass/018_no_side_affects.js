module.exports = {
    state: {
        data: null,
        count: ($) => $.data = 10
    },
    fn: ($) => {},
    _: {
        fn: [ 'count' ],
        subs: [],
        deps: { count: [] },
        cache: { data: null, count: 10 },
        fatal: {
            msg: "function count is trying to change data",
            stack: ['count']
        }
    },
    ignore: ['cache']
}