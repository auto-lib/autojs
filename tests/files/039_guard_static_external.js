
module.exports = {
    obj: {},
    fn: ($) => {
        $.add_static_external({
            data: [1,2,3,4]
        });
        $.add_dynamic({
            count: _ => _.data ? _.data.length : undefined
        })
    },
    _: {
        fn: ['count'],
        deps: { count: {} },
        subs: {},
        value: { data: [1,2,3,4], count: undefined },
        fatal: {
            msg: `Function 'count' tried to access external variable 'data'`,
            stack: ['count']
        }
    },
}