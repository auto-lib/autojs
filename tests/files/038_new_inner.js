// devlog/docs/035_reintroduce_inner_objects.md

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
        fn: {
            x: true,
            inner: {
                z: true
            }
        },
        deps: { 
            x: { w: true }, 
            inner: {
                z: { x: true, y: true }
            }
        },
        subs: { },
        value: { 
            w: 10, 
            x: 20, 
            inner: {
                y: 30,
                z: 600
            } 
        },
        fatal: { }
    }
}