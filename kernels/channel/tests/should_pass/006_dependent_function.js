module.exports = {
    state: {
        data: null,
        count: ($) => $.data ? $.data.length : 0 
    },
    fn: ($) => {
        $.data = [1,2,3];
    },
    _: {
        fn: ['count'],
        subs: [],
        deps: { count: ['data'] },
        cache: { data: [1,2,3], count: 3 },
        fatal: {}
    }
}