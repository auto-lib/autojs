// devlog/docs/036_resolve.md

module.exports = {
    obj: {
        a: 10,
        b: (_) => _.a + 1,
        x: {
            a: 20,
            c: (_) => _.a + _.b,
            y: {
                d: (_) => _.a + _.c
            }
        }
    },
    fn: ($) => {
    },
    _: {
        fn: [ 'x', 'inner.z'],
        deps: { 
            x: { 
                w: true
            }, 
            'inner.z': {
                x: true,
                'inner.y': true
            }
        },
        subs: { },
        value: { 
            w: 10, 
            x: 20, 
            'inner.y': 30,
            'inner.z': 600
        },
        resolve: {
            'inner.z': {
                'y': 'inner.y'
            }
        },
        fatal: { }
    }
}