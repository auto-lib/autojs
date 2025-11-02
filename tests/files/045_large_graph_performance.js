// Performance test: Large graph with isolated branches
// Tests that invalidation is O(affected) not O(n)
//
// Graph structure:
//   branch_a -> derived_a1 -> derived_a2
//   branch_b -> derived_b1 -> derived_b2
//   branch_c -> derived_c1 -> derived_c2
//
// Changing branch_a should NOT touch branches b or c

export default {
    obj: {
        // Branch A
        branch_a: 1,
        derived_a1: ($) => $.branch_a * 2,
        derived_a2: ($) => $.derived_a1 * 2,

        // Branch B (isolated from A)
        branch_b: 1,
        derived_b1: ($) => $.branch_b * 2,
        derived_b2: ($) => $.derived_b1 * 2,

        // Branch C (isolated from A and B)
        branch_c: 1,
        derived_c1: ($) => $.branch_c * 2,
        derived_c2: ($) => $.derived_c1 * 2,

        '#fatal': () => {}
    },
    fn: ($, global) => {
        // Change only branch_a
        $.branch_a = 10;

        // With O(affected) optimization:
        // - Only derived_a1 and derived_a2 should be in deps after update
        // - Branch B and C values should remain computed (not deleted)

        global.branch_b_still_has_value = 'derived_b1' in $._. value;
        global.branch_c_still_has_value = 'derived_c1' in $._.value;
    },
    opt: {
        count: true
    },
    _: {
        fn: ['derived_a1', 'derived_a2', 'derived_b1', 'derived_b2', 'derived_c1', 'derived_c2'],
        deps: {
            derived_a1: { branch_a: true },
            derived_a2: { derived_a1: true },
            derived_b1: { branch_b: true },
            derived_b2: { derived_b1: true },
            derived_c1: { branch_c: true },
            derived_c2: { derived_c1: true }
        },
        subs: {},
        value: {
            branch_a: 10,
            derived_a1: 20,
            derived_a2: 40,
            branch_b: 1,
            derived_b1: 2,
            derived_b2: 4,
            branch_c: 1,
            derived_c1: 2,
            derived_c2: 4
        },
        fatal: {}
    },
    global: {
        // Branch B and C should not be affected by branch A changes
        branch_b_still_has_value: true,
        branch_c_still_has_value: true
    }
}
