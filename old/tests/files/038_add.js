
export default {
    obj: {},
    fn: ($) => {
        $.add_static({
            data: [1,2,3,4]
        });
        $.add_dynamic({
            count: _ => _.data.length
        })
    },
    _: {
        fn: ['count'],
        deps: { count: { data: true } },
        subs: {},
        value: { data: [1,2,3,4], count: 4 },
        fatal: {}
    },
}