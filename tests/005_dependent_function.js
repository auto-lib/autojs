module.exports = {
    obj: {
        data: null,
        count: ($) => $.data ? $.data.length : 0 
    },
    fn: ($) => {
        //$.data = [1,2,3];
        //let x = $.count;
    },
    _: {
        deps: { count: ['data'] },
        stale: {},
        value: { data: null, count: 0 }
    }
}