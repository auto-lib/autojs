module.exports = {
    obj: {
        data: null,
    },
    fn: ($, global) => {
        $['#'].data.subscribe( v => global.msg = "data is "+v );
        $.data = [1,2,3];
    },
    _: {
        fn: [ ],
        deps: { },
        subs: { data: ['000'] },
        value: { data: [1,2,3] },
        fatal: {}
    },
    global: {
        msg: "data is 1,2,3"
    }
}