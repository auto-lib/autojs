module.exports = {
    obj: {
        data: null,
        count: ($) => $.data ? $.data.length : 0,
        is_data_set: ($) => $.data == null
    },
    fn: ($, global) => {
        $['#'].count.subscribe( v => global.msg = "count is "+v );
        $.data = [1,2,3];
    },
    _: {
        fn: [ 'count', 'is_data_set' ],
        deps: { count: { data: true }, is_data_set: { data: true } },
        subs: { count: ['000'] },
        value: { data: [1,2,3], count: 3, is_data_set: false },
        fatal: {}
    },
    global: {
        msg: "count is 3"
    }
}