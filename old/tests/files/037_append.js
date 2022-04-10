// devlog/docs/028_complete_leaves.md

module.exports = {
    obj: {
        x: 10,
        y: (_) => _.x * 2
    },
    fn: ($) => {
        $.append({
            z: (_) => _.y * 3
        })
    },
    _: {
        fn: [ 'y', 'z' ],
        deps: { 
            y: { x: true }, 
            z: { y: true }
        },
        subs: { },
        value: { x: 10, y: 20, z: 60 },
        fatal: { }
    }
}