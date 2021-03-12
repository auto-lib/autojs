module.exports = {
    obj: {
        data: null,
        count: ($) => $.data ? $.data.length : 0,
        twice_count: ($) => 2 * $.count
    },
    fn: ($, global) => {
        $['#'].twice_count.subscribe( v => global.msg = "twice_count is "+v );
        $.data = [1,2,3];
    },
    _: {
        fn: [ 'count', 'twice_count' ],
        deps: { count: ['data'], twice_count: ['count'] },
        subs: { twice_count: ['000'] },
        value: { data: [1,2,3], count: 3, twice_count: 6 },
        fatal: {}
    },
    global: {
        msg: "twice_count is 6"
    }
}