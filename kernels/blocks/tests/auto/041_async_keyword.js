// Test: Async keyword support

export default {
    obj: {
        async_func: async (_,set) => 123
    },
    fn: ($) => {},
    timeout: 100, // wait for a set time
    _: {
        fn: ['async_func'],
        deps: { async_func: {} },
        value: { async_func: 123 },
        stale: [],
        fatal: {}
    }
};
