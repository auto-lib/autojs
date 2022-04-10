module.exports = {
    obj: {
        data: null,
        count: ($) => $.data ? $.data.length : 0,
    },
    fn: ($) => {
        $.data = [1,2,3];
        let x = $.count;
    },
    _: {
        fn: ['count'],
        subs: [],
        deps: { count: { data: true } },
        value: { data: [1,2,3], count: 3 },
        fatal: {}
    }
}