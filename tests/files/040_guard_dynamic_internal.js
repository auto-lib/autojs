
module.exports = {
    obj: {},
    fn: ($) => {
        $.add_static_mixed({
            data: [1,2,3,4]
        });
        $.add_dynamic_internal({
            count: _ => _.data ? _.data.length : undefined
        })
        let x = $.count;
    },
    _: {
        fn: ['count'],
        deps: { count: { data: true } },
        subs: {},
        value: { data: [1,2,3,4], count: 4 },
        fatal: {
            msg: `External read of internal function 'count'`,
            stack: []
        }
    },
}