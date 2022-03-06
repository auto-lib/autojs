// devlog/docs/036_resolve.md

module.exports = {
    obj: {
        w: 10,
        x: (_) => _.w * 2,
        inner: {
            y: 30,
            z: (_) => _.x * _.y
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