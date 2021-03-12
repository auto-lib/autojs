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
        deps: { count: ['data'], is_data_set: ['data'] },
        subs: { count: ['000'] },
        value: { data: [1,2,3], count: 3 },
        fatal: {}
    },
    global: {
        msg: "count is 3"
    }
}