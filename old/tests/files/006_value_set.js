export default {
    obj: {
        data: null
    },
    fn: ($) => {
        $.data = [1,2,3];
    },
    _: {
        fn: [],
        subs: [],
        deps: {},
        value: { data: [1,2,3] },
        fatal: {}
    }
}