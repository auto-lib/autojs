import auto from '../auto-es6.js';

console.log('Testing root cause analysis...\n');

let $ = auto({
    data: null,
    lines: ($) => $.data ? $.data.map(d => d * 2) : [],
    count: ($) => $.lines ? $.lines.length : 0,
    doubled_count: ($) => $.count * 2
}, {
    tag: 'test',
    auto_batch: false,  // Disable auto-batching so each set is a separate transaction
    max_calls_per_second: 10,
    call_rate_window: 1000,
    excessive_calls_collection_period: 2000,
    call_rate_backoff: 1000
});

console.log('Setting data 15 times rapidly...\n');

for (let i = 0; i < 15; i++) {
    $.data = [i, i+1, i+2];
}

console.log('Waiting for collection and report...\n');

// Wait for collection (2s) + a bit more
setTimeout(() => {
    console.log('\nFinal values:');
    console.log('data:', $.data);
    console.log('count:', $.count);
    console.log('doubled_count:', $.doubled_count);
    process.exit(0);
}, 3000);
