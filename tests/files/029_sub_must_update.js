// devlog/docs/023_update_on_sub.md

// make sure that values are updated
// when they are subscribed to

export default {
    obj: {
        data: null,
        derived: (_) => _.data ? _.data.length : 0
    },
    fn: ($, global) => {
        $.data = [1,2,3];
        $['#'].derived.subscribe( v => global.msg = "derived is "+v );
    },
    _: {
        fn: [ 'derived' ],
        deps: { derived: { data: true } },
        subs: { derived: ['000'] },
        value: { data: [1,2,3], derived: 3 },
        fatal: {}
    },
    global: {
        msg: "derived is 3"
    }
}