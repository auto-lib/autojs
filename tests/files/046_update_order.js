// Performance test: Verify topological ordering
// Updates should happen in dependency order

let execution_order = [];

export default {
    obj: {
        // Diamond dependency graph:
        //        data
        //       /    \
        //   left     right
        //       \    /
        //       bottom

        data: 1,
        left: ($) => {
            execution_order.push('left');
            return $.data * 2;
        },
        right: ($) => {
            execution_order.push('right');
            return $.data * 3;
        },
        bottom: ($) => {
            execution_order.push('bottom');
            return $.left + $.right;
        },
        '#fatal': () => {}
    },
    fn: ($, global) => {
        execution_order = []; // reset

        // Set data - should update in correct order
        $.data = 10;

        // left and right can be in any order (parallel)
        // but bottom MUST come after both left and right
        global.execution_order = execution_order;

        let bottom_index = execution_order.indexOf('bottom');
        let left_index = execution_order.indexOf('left');
        let right_index = execution_order.indexOf('right');

        global.bottom_after_left = bottom_index > left_index;
        global.bottom_after_right = bottom_index > right_index;
        global.all_ran = execution_order.length === 3;
    },
    opt: {
        auto_batch: false
    },
    _: {
        fn: ['left', 'right', 'bottom'],
        deps: {
            left: { data: true },
            right: { data: true },
            bottom: { left: true, right: true }
        },
        subs: {},
        value: {
            data: 10,
            left: 20,
            right: 30,
            bottom: 50
        },
        fatal: {}
    },
    global: {
        execution_order: ['left', 'right', 'bottom'],  // order may vary for left/right
        bottom_after_left: true,
        bottom_after_right: true,
        all_ran: true
    }
}
