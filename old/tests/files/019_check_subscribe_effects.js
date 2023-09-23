export default {
    obj: {
        data: null,
        count: ($) => $.data ? $.data.length : 0
    },
    fn: ($, global) => {
        $['#'].count.subscribe( v => global.msg = "count is "+v );
        $.data = [1,2,3];
    },
    _: {
        fn: [ 'count' ],
        deps: { count: { data: true } },
        subs: { count: ['000'] },
        value: { data: [1,2,3], count: 3 },
        fatal: {}
    },
    global: {
        msg: "count is 3"
    }
}