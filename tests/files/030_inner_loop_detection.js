// devlog/docs/024_more_loop_detection.md

// make sure that loops are seen
// even if they aren't on the edges...

export default {
    obj: {
        data: [1,2,3],
        initial: (_) => _.data.length + _.loop_a,
        loop_a: (_) => _.loop_b,
        loop_b: (_) => _.loop_a
    },
    fn: ($, global) => {},
    _: {
        fn: [ 'initial', 'loop_a', 'loop_b' ],
        deps: { 
            initial: { data: true },
            loop_a: {  },
            loop_b: {  } },
        subs: { },
        value: { data: [1,2,3], initial: NaN, loop_a: undefined, loop_b: undefined },
        fatal: {
            msg: 'circular dependency',
            stack: [ 'initial', 'loop_a', 'loop_b', 'loop_a' ]
        }
    }
}