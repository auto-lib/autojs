module.exports = {
    obj: {
        data: null,
        count: ($) => $.data ? $.data.length : 0 
    },
    fn: ($) => {
        $.data = [1,2,3];
    },
    _: {
        deps: { count: ['data'] },
        stale: { count: true },
        value: { data: [1,2,3], count: 0 }
    }
}