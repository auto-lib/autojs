// Test: Static value and dependent function

export default {
    obj: {
        x: 5,
        doubled: ($) => $.x * 2
    },
    fn: ($) => {},
    _: {
        fn: ['doubled'],
        deps: { doubled: { x: true } },
        value: { doubled: 10, x: 5 },
        stale: [],
        fatal: {}
    }
};
