module.exports = {
    obj: {
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
        value: { data: [1,2,3] },
        fatal: {}
    }
}