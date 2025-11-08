module.exports = {
    state: {
        data: null,
        count: ($) => $.data ? $.data.length : 0 
    },
    fn: ($) => {},
    _: {
        fn: ['count'],
        subs: [],
        deps: { count: ['data'] },
        cache: { data: null, count: 1 },
        fatal: {}
    },
    should_fail: true
}