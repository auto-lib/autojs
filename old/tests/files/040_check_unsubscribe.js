module.exports = {
    obj: {
        data: null,
        count: ($) => $.data ? $.data.length : 0,
    },
    fn: ($, global) => {
        let fn = $['#'].count.subscribe( v => global.msg = "count is "+v );
        $.data = [1,2,3];
        fn();
        $.data = [1,2,3,4];
    },
    _: {
        fn: [ 'count' ],
        deps: { count: ['data'], twice_count: ['count'] },
        value: { data: [1,2,3,4], count: 4 },
        fatal: {}
    },
    global: {
        msg: "twice_count is 3"
    }
}