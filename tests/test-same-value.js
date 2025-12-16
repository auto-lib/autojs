import auto from '../auto-es6.js';

console.log('Testing root cause analysis with same value set repeatedly...\n');

let $ = auto({
    filter: 'bird',
    data: ($) => $.filter === 'bird' ? [1,2,3] : [4,5,6],
    count: ($) => $.data ? $.data.length : 0
}, {
    tag: 'test',
    auto_batch: false,
    max_calls_per_second: 10,
    call_rate_window: 1000,
    excessive_calls_collection_period: 2000,
    call_rate_backoff: 1000
});

console.log('Setting filter to "bird" 15 times (same value)...\n');

for (let i = 0; i < 15; i++) {
    $.filter = 'bird';  // Same value every time
}

console.log('Waiting for collection and report...\n');

setTimeout(() => {
    console.log('\nFinal values:');
    console.log('filter:', $.filter);
    console.log('count:', $.count);
    process.exit(0);
}, 3000);
