/**
 * Basic tests from readme.md
 */

import auto from './auto.js';

console.log('='.repeat(50));
console.log('TEST 1: Basic reactivity');
console.log('='.repeat(50));

let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => $.data + " has " + $.count + " items"
});

console.log('Initial state:');
console.log('  data =', $.data);
console.log('  count =', $.count);
console.log('  msg =', $.msg);

console.log('\nSetting data = [1,2,3]...');
$.data = [1,2,3];

console.log('After set:');
console.log('  data =', $.data);
console.log('  count =', $.count);
console.log('  msg =', $.msg);

console.log('\nExpected: msg = "1,2,3 has 3 items"');
console.log('Got:      msg = "' + $.msg + '"');
console.log('PASS:', $.msg === "1,2,3 has 3 items" ? 'YES' : 'NO');

console.log('\n' + '='.repeat(50));
console.log('TEST 2: No side effects (should fail)');
console.log('='.repeat(50));

let $2 = auto({
    data: null,
    update: ($) => $.data = [1,2,3]  // This should cause a fatal
});

console.log('Fatal state:', $2._.fatal);
console.log('PASS:', $2._.fatal.msg ? 'YES (correctly caught)' : 'NO');

console.log('\n' + '='.repeat(50));
console.log('TEST 3: Dependent functions');
console.log('='.repeat(50));

let $3 = auto({
    a: 1,
    b: 2,
    sum: ($) => $.a + $.b,
    doubled: ($) => $.sum * 2
});

console.log('Initial:');
console.log('  a =', $3.a);
console.log('  b =', $3.b);
console.log('  sum =', $3.sum);
console.log('  doubled =', $3.doubled);

console.log('\nSetting a = 10...');
$3.a = 10;

console.log('After set:');
console.log('  a =', $3.a);
console.log('  sum =', $3.sum);
console.log('  doubled =', $3.doubled);

console.log('\nExpected: doubled = 24');
console.log('Got:      doubled =', $3.doubled);
console.log('PASS:', $3.doubled === 24 ? 'YES' : 'NO');

console.log('\n' + '='.repeat(50));
console.log('TEST 4: Internals inspection');
console.log('='.repeat(50));

let $4 = auto({
    data: [1,2,3],
    count: ($) => $.data.length
});

console.log('$._:');
console.log('  values:', $4._.values);
console.log('  deps:', Object.fromEntries(
    Object.entries($4._.deps).map(([k, v]) => [k, Array.from(v)])
));

console.log('\n' + '='.repeat(50));
console.log('TEST 5: Circular dependency detection');
console.log('='.repeat(50));

let $5 = auto({
    a: ($) => $.b + 1,
    b: ($) => $.a + 1
});

console.log('Fatal state:', $5._.fatal);
console.log('PASS:', $5._.fatal.msg && $5._.fatal.msg.includes('circular') ? 'YES' : 'NO');

console.log('\n' + '='.repeat(50));
console.log('TEST 6: Subscriptions');
console.log('='.repeat(50));

let $6 = auto({
    x: 0,
    doubled: ($) => $.x * 2
});

let log = [];
let unsub = $6['#'].doubled.subscribe(v => {
    log.push(v);
    console.log('  subscription fired: doubled =', v);
});

console.log('Setting x = 5...');
$6.x = 5;
$6.flush();  // flush to trigger subscription

console.log('Setting x = 10...');
$6.x = 10;
$6.flush();  // flush to trigger subscription

console.log('\nSubscription log:', log);
console.log('Expected: [0, 10, 20]');
console.log('PASS:', JSON.stringify(log) === JSON.stringify([0, 10, 20]) ? 'YES' : 'NO');

unsub();
console.log('\nUnsubscribed. Setting x = 100...');
$6.x = 100;
console.log('Log after unsub:', log);
console.log('PASS (no new entries):', log.length === 3 ? 'YES' : 'NO');

console.log('\n' + '='.repeat(50));
console.log('ALL TESTS COMPLETE');
console.log('='.repeat(50));
