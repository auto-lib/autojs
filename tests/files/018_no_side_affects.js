module.exports = {
    obj: {
        data: null,
        count: ($) => $.data = 10
    },
    fn: ($) => {},
    _: {
        fn: [ 'count' ],
        subs: [],
        deps: { 'count': [] },
        value: { data: null },
        fatal: {
            msg: "can't have side affects (setting data) inside a function (count)",
            stack: ['count']
        }
    }
}