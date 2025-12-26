# Recorder/Playback System

## Overview

The Recorder/Playback system captures transactions from your production application and replays them on your laptop to detect breaking changes. It's like having a time machine that shows you if your code changes break existing behavior.

## The Problem It Solves

When you change your web application's state management code, you need to know:
- Did I break anything?
- What inputs cause this specific output?
- Can I reproduce production behavior locally?

The recorder gives you **automatic regression testing** based on real production data.

## How It Works

### Recording (Production)
1. Recorder plugs into the `trace` callback
2. Captures **inputs** (what changed from outside)
3. Captures **outputs** (computed values you care about)
4. Saves recordings to a file

### Playback (Development)
1. Load recordings from production
2. Create fresh auto() instance with your current code
3. Replay inputs exactly as they happened
4. Compare outputs to detect differences
5. Report any regressions found

## Quick Start

### 1. Setup Recording in Production

```javascript
const auto = require('auto');
const { createRecorder } = require('./recorder');

// Create recorder
const recorder = createRecorder({
    captureInputs: ['api_response', 'user_input', 'selected_filter'],
    captureOutputs: ['filtered_items', 'chart_data', 'summary_stats'],
    maxRecordings: 1000
});

// Create auto instance with recorder
const _ = auto(state, {
    trace: (trace) => recorder.record(trace)
});

// Capture initial state once
recorder.captureInitialState(_);

// ... use your app normally ...

// Periodically save recordings
setInterval(() => {
    recorder.save('./recordings/latest.json');
}, 60000); // Save every minute
```

### 2. Run Playback on Your Laptop

```javascript
const { loadRecordings, playback, reportResults } = require('./recorder');

// Load production recordings
const recordingData = loadRecordings('./recordings/latest.json');

// Function to create fresh instance
const createAutoInstance = () => {
    return auto(state, { auto_batch: true });
};

// Run playback
const results = playback(recordingData, createAutoInstance, {
    verbose: true
});

// Report
reportResults(results);

if (results.failed > 0) {
    console.error('❌ Regressions detected!');
    process.exit(1);
}
```

## API Reference

### `createRecorder(options)`

Creates a recorder instance.

**Options:**
- `captureInputs: string[]` - Variable names that are inputs (set from outside)
- `captureOutputs: string[]` - Variable names to validate (computed values)
- `maxRecordings: number` - Max recordings to keep in memory (default: 1000)
- `captureInitialState: boolean` - Capture starting state (default: true)
- `shouldRecord: (trace) => boolean` - Optional filter function

**Returns:** Recorder instance

**Example:**
```javascript
const recorder = createRecorder({
    captureInputs: ['api_data', 'user_choice'],
    captureOutputs: ['display_data', 'chart_config'],
    maxRecordings: 500,
    shouldRecord: (trace) => {
        // Only record API updates
        return trace.triggers.some(t => t.name === 'api_data');
    }
});
```

### `recorder.record(trace)`

Records a transaction trace. Pass this to auto() `trace` option.

**Example:**
```javascript
const _ = auto(state, {
    trace: (trace) => recorder.record(trace)
});
```

### `recorder.captureInitialState(autoInstance)`

Captures the initial state of all tracked variables. Call once after setup.

**Example:**
```javascript
const _ = auto(state, { trace: recorder.record });
recorder.captureInitialState(_);
```

### `recorder.getRecordings()`

Returns array of all recordings in memory.

### `recorder.save(filepath)`

Saves recordings to JSON file.

**Example:**
```javascript
recorder.save('./recordings/session_2025-01-03.json');
```

### `recorder.stats()`

Returns recording statistics.

### `loadRecordings(filepath)`

Loads recordings from JSON file.

**Returns:**
```javascript
{
    session_id: 'session_12345',
    recorded_at: '2025-01-03T12:00:00Z',
    initial_state: { input: 0, filter: 'all' },
    recordings: [...],
    metadata: {
        captureInputs: ['input'],
        captureOutputs: ['result'],
        count: 100
    }
}
```

### `playback(recordingData, createAutoInstance, options)`

Replays recordings and compares outputs.

**Parameters:**
- `recordingData` - Data from `loadRecordings()`
- `createAutoInstance` - Function that creates a fresh auto() instance
- `options.verbose` - Log each playback (default: false)
- `options.comparator` - Custom comparison function

**Returns:**
```javascript
{
    total: 100,
    passed: 95,
    failed: 5,
    failures: [
        {
            recording_id: 'session_123_42',
            timestamp: 1704326400000,
            inputs: [{ name: 'input', value: 42 }],
            diffs: {
                output: {
                    expected: 84,
                    actual: 85,
                    message: 'output changed'
                }
            }
        }
    ]
}
```

### `reportResults(results)`

Prints human-readable report of playback results.

### `createComparator(options)`

Creates a custom comparator with tolerances.

**Options:**
- `ignoreFields: string[]` - Field names to ignore in objects
- `numberTolerance: number` - Tolerance for number comparisons
- `ignoreVariables: string[]` - Variable names to skip

**Example:**
```javascript
const comparator = createComparator({
    ignoreFields: ['timestamp', 'id'],
    numberTolerance: 0.01,
    ignoreVariables: ['debug_info']
});

const results = playback(recordingData, createAutoInstance, {
    comparator
});
```

## Recording Format

```json
{
  "session_id": "session_1704326400000_abc123",
  "recorded_at": "2025-01-03T12:00:00.000Z",
  "initial_state": {
    "api_response": null,
    "user_filter": "all"
  },
  "recordings": [
    {
      "id": "session_1704326400000_abc123_0",
      "timestamp": 1704326400000,
      "inputs": [
        {
          "name": "api_response",
          "value": { "data": [...] }
        }
      ],
      "outputs": {
        "filtered_data": [...],
        "stats": { "count": 3, "avg": 125 }
      },
      "trace": {
        "id": 1,
        "allTriggers": ["api_response"],
        "allUpdates": ["filtered_data", "stats", "display"]
      }
    }
  ],
  "metadata": {
    "captureInputs": ["api_response", "user_filter"],
    "captureOutputs": ["filtered_data", "stats"],
    "count": 1
  }
}
```

## Integration Patterns

### Pattern 1: Continuous Recording

```javascript
// Production app
const recorder = createRecorder({
    captureInputs: ['api_data'],
    captureOutputs: ['display'],
    maxRecordings: 1000
});

const _ = auto(state, {
    trace: recorder.record
});

// Auto-save every minute
setInterval(() => {
    const timestamp = new Date().toISOString().split('T')[0];
    recorder.save(`./recordings/${timestamp}.json`);
    recorder.clear(); // Clear to start fresh
}, 60000);
```

### Pattern 2: Sampling (High-Traffic Apps)

```javascript
const recorder = createRecorder({
    captureInputs: ['api_data'],
    captureOutputs: ['display'],
    shouldRecord: (trace) => {
        // Only record 10% of transactions
        return Math.random() < 0.1;
    }
});
```

### Pattern 3: Focused Recording (Debugging)

```javascript
const recorder = createRecorder({
    captureInputs: ['user_action'],
    captureOutputs: ['result'],
    shouldRecord: (trace) => {
        // Only record when specific variable changes
        return trace.triggers.some(t =>
            t.name === 'user_action' && t.value.type === 'submit'
        );
    }
});
```

### Pattern 4: CI/CD Integration

```javascript
// In your test script
const { loadRecordings, playback } = require('./recorder');

async function runRegressionTests() {
    // Download latest recordings from production
    const recordings = await downloadFromProduction();

    // Run playback
    const results = playback(recordings, createAutoInstance);

    // Fail CI if regressions detected
    if (results.failed > 0) {
        reportResults(results);
        process.exit(1);
    }

    console.log('✅ No regressions detected');
}
```

## Advanced Usage

### Custom Comparators

```javascript
const comparator = (expected, actual, name) => {
    // Ignore timestamp fields
    if (name === 'last_updated') return null;

    // Custom logic for arrays
    if (Array.isArray(expected) && Array.isArray(actual)) {
        if (expected.length !== actual.length) {
            return {
                expected,
                actual,
                message: `${name} length changed: ${expected.length} → ${actual.length}`
            };
        }
    }

    // Default comparison
    if (JSON.stringify(expected) === JSON.stringify(actual)) {
        return null;
    }

    return { expected, actual, message: `${name} changed` };
};

const results = playback(recordingData, createAutoInstance, {
    comparator
});
```

### Filtering Recordings Before Playback

```javascript
const recordingData = loadRecordings('./recordings.json');

// Only test recent recordings
recordingData.recordings = recordingData.recordings
    .filter(r => r.timestamp > Date.now() - 86400000); // Last 24 hours

const results = playback(recordingData, createAutoInstance);
```

### Debugging Failed Playbacks

```javascript
const results = playback(recordingData, createAutoInstance, {
    verbose: true
});

results.failures.forEach(failure => {
    console.log('Failed recording:', failure.recording_id);
    console.log('Inputs:');
    failure.inputs.forEach(input => {
        console.log(`  ${input.name} =`, input.value);
    });
    console.log('Diffs:');
    Object.keys(failure.diffs).forEach(name => {
        console.log(`  ${name}:`);
        console.log('    Expected:', failure.diffs[name].expected);
        console.log('    Got:     ', failure.diffs[name].actual);
    });
});
```

## Best Practices

1. **Choose inputs/outputs carefully**
   - Inputs: Variables set from outside (API responses, user actions)
   - Outputs: Key computed values that matter for correctness

2. **Limit recording size**
   - Use `maxRecordings` to prevent memory issues
   - Use `shouldRecord` to sample or filter

3. **Save recordings regularly**
   - Don't lose data if app crashes
   - Easier to track down when regressions were introduced

4. **Version your recordings**
   - Keep recordings organized by date/version
   - Easy to bisect when issues started

5. **Use in CI/CD**
   - Run playback on every commit
   - Catch regressions before they reach production

6. **Handle non-determinism**
   - Use custom comparators to ignore timestamps, random IDs, etc.
   - Focus on business logic, not implementation details

## Troubleshooting

### "Too many recordings"
Increase `maxRecordings` or use `shouldRecord` to filter.

### "Playback always fails"
Check if your comparator is too strict. Use custom comparator to ignore non-deterministic fields.

### "Can't serialize values"
Some values (functions, symbols) can't be JSON-serialized. Consider using a custom clone function.

### "Recordings too large"
Only capture essential outputs. Use `shouldRecord` to sample transactions.

## Limitations

1. **JSON serialization**: Values must be JSON-serializable
2. **No time travel**: Can't replay async operations exactly as they happened
3. **State side effects**: External side effects (localStorage, network) not captured
4. **Memory usage**: Large recordings can consume significant memory

## Future Enhancements

- Compression for large recordings
- Cloud storage integration
- Web UI for browsing recordings
- Automatic test case generation
- Differential replay (only changed recordings)

---

*This recorder system is designed specifically for auto.js and leverages its transaction tracing capabilities.*
