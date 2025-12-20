/**
 * Example usage of graph-first architecture
 */

import auto from './src/graph-first.js';

console.log('=== Graph-First Auto.js Example ===\n');

// Create a reactive object
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => `Got ${$.count} items`,
    doubled: ($) => $.count * 2
});

console.log('1. Initial graph structure:');
console.log('   Nodes:', $._.fn);
console.log('   Dependencies:', $._.deps);
console.log('   Execution order:', $._.order);
console.log();

console.log('2. GraphViz visualization:');
console.log($.visualize());
console.log();

console.log('3. Initial values:');
console.log('   data:', $.data);
console.log('   count:', $.count);
console.log('   msg:', $.msg);
console.log();

console.log('4. Set data to [1, 2, 3]:');
$.data = [1, 2, 3];
console.log('   count:', $.count);
console.log('   msg:', $.msg);
console.log('   doubled:', $.doubled);
console.log();

console.log('5. Introspection after update:');
console.log('   Values:', $._.value);
console.log('   Dirty:', $._.dirty);
console.log();

console.log('6. Who depends on "count"?');
console.log('   ', Array.from($._.graph.getDependents('count')));
console.log();

console.log('7. What does "msg" depend on?');
console.log('   ', Array.from($._.graph.getDependencies('msg')));
console.log();

console.log('8. Upstream graph for "doubled":');
console.log('   ', Array.from($._.graph.getUpstreamGraph('doubled')));
console.log();

// Test error handling
console.log('9. Error handling:');
try {
    $.count = 10;  // Should fail - count is computed
} catch (e) {
    console.log('   ✓ Correctly prevented:', e.message);
}
console.log();

// More complex example
console.log('10. More complex example (nested dependencies):');
let $2 = auto({
    x: 1,
    y: 2,
    sum: ($) => $.x + $.y,
    product: ($) => $.x * $.y,
    combined: ($) => $.sum + $.product,
    formatted: ($) => `sum=${$.sum}, product=${$.product}, combined=${$.combined}`
});

console.log('    Execution order:', $2._.order);
console.log('    Initial formatted:', $2.formatted);
$2.x = 5;
console.log('    After x=5:', $2.formatted);
console.log();

console.log('=== Complete ===');
