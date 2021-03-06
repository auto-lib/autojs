export default {
    obj: {
        data: null,
        get count() { return this.data ? this.data.length : 0 },
    },
    fn: ($) => {
        //$.data = [1,2,3];
        //let x = $.count;
    },
    _: {
        deps: { count: ['data'] },
        dirty: {},
        value: { data: [1,2,3], count: 3 }
    }
}