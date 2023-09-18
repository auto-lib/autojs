
let var2_func = (v) => v + 1;
let var3_func = (v) => {
    if (v==1) return 'one';
    else if (v==2) return 'two';
    else if (v==3) return 'three';
    else if (v==4) return 'four';
    else return 'unknown';
}

export default {
    obj: {
        tst: {
            var1: [1,2,3],
            var2: ($) => $.tst.var1.map( v => var2_func(v) ),
            var3: ($) => $.tst.var2.map( v => var3_func(v) )
        }
    },
    fn: ($) => {
    },
    _: {
        fn: [ 'tst.var2', 'tst.var3' ],
        subs: [],
        deps: { 
            'tst.var2': [ 'tst.var1' ], 
            'tst.var3': [ 'tst.var2' ] },
        value: { 
            'tst.var1': [1,2,3],
            'tst.var2': [2,3,4],
            'tst.var3': ['two','three','four']
        },
        fatal: {}
    }
}