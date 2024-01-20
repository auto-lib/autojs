
export default {
    obj: {
        async_func: async (_,set) => 123
    },
    fn: ($, global) => {},
    timeout: 100, // wait for a set time
    _: {
        fn: [ 'async_func' ],
        deps: { async_func: {} },
        subs: { },
        value: { async_func: 123 },
        fatal: { }
    }
}