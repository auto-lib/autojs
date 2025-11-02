# 047: Auto-Batching

**Version:** 1.47.1

## The Problem It Solves

Often code sets multiple values in rapid succession (loops, API responses, event handlers), but you don't control that code to wrap it in `.batch()`. Each set triggers a full propagation, wasting computation:

```javascript
// Without auto-batch: 10 transactions, expensive function runs 10 times
for (let i = 0; i < 10; i++) {
    $.items = Array(i).fill('item');  // Triggers propagation each time!
}
```

## The Solution: Automatic Batching

Auto-batch detects rapid successive sets and automatically groups them into one transaction:

```javascript
let $ = auto(obj, {
    auto_batch: true,        // Enable auto-batching (now default)
    auto_batch_delay: 0      // 0ms = next tick (default)
});

// Same loop, but now: 1 transaction, expensive function runs 1 time
for (let i = 0; i < 10; i++) {
    $.items = Array(i).fill('item');  // Accumulated!
}
// After loop completes, timer fires → ONE propagation
```

## How It Works

1. **Set happens** → Value updated immediately (synchronous)
2. **Timer scheduled** → setTimeout with configurable delay
3. **More sets?** → Reset timer, accumulate triggers
4. **Timer fires** → Process all accumulated triggers as ONE transaction

## Configuration

```javascript
auto(obj, {
    auto_batch: true,          // Enabled by default
    auto_batch_delay: 0        // Delay in ms (0 = next tick)
});
```

**Delay options:**
- `0` (default) - Next event loop tick (best for most cases)
- `1-5ms` - Debounce rapid changes
- Higher values - For very bursty workloads

**Disable if needed:**
```javascript
auto(obj, { auto_batch: false })  // Opt-out for synchronous behavior
```

## Interaction with Explicit Batch

**Priority order:**
1. **Explicit `.batch()`** - Takes precedence, propagates immediately
2. **Auto-batch** - Timer-based accumulation
3. **Normal** - Immediate propagation

```javascript
// Auto-batch enabled, but explicit batch takes priority
$.batch(() => {
    $.a = 1;
    $.b = 2;
}); // Propagates immediately (synchronous)

// Outside batch - auto-batch kicks in
$.c = 3;
$.d = 4;  // Timer scheduled, accumulates...
// Timer fires → propagates
```

## Performance Impact

**Example: Loop setting 10 values**

| Mode | Transactions | Function Executions | Subscription Fires |
|------|-------------|--------------------|--------------------|
| No auto-batch | 10 | 10 | 10 |
| Auto-batch | 1 | 1 | 1 |
| **Improvement** | **10x fewer** | **10x fewer** | **10x fewer** |

## Use Cases

Perfect for:
- **Loops** updating multiple values
- **API responses** setting many fields
- **Event handlers** firing rapidly (scroll, resize, mousemove)
- **Form inputs** where you don't control the calling code
- **Third-party code** setting your state

## Implementation Details

### State Variables

```javascript
let auto_batch_enabled = opt && 'auto_batch' in opt ? opt.auto_batch : true;
let auto_batch_delay = opt && 'auto_batch_delay' in opt ? opt.auto_batch_delay : 0;
let auto_batch_timer = null;     // pending timer
let auto_batch_pending = [];     // pending triggers for auto-batch
```

### Setter Logic

```javascript
let setter = (name, val) => {
    value[name] = val; // Update immediately (synchronous)

    // Priority 1: Explicit batch
    if (in_batch) {
        batch_triggers.push({ name, value: val });
    }
    // Priority 2: Auto-batch
    else if (auto_batch_enabled) {
        auto_batch_pending.push({ name, value: val });
        if (auto_batch_timer !== null) clearTimeout(auto_batch_timer);
        auto_batch_timer = setTimeout(flush_auto_batch, auto_batch_delay);
    }
    // Priority 3: Immediate propagation
    else {
        propagate({ name, value: val });
    }
}
```

### Flush Function

```javascript
let flush_auto_batch = () => {
    if (auto_batch_pending.length === 0) return;

    let triggers = auto_batch_pending;
    auto_batch_pending = [];
    auto_batch_timer = null;

    propagate(triggers);  // One transaction with all triggers
};
```

## Tests

### 051_auto_batch.js - Basic Auto-Batching
- ✅ Three rapid sets → ONE transaction with 3 triggers

### 052_auto_batch_off_by_default.js - Opt-Out
- ✅ Without `auto_batch: true` → three separate transactions (backward compatible)

### 053_explicit_batch_priority.js - Priority Handling
- ✅ Explicit `.batch()` works even with auto-batch enabled
- ✅ Propagates synchronously (doesn't wait for timer)

### 054_auto_batch_loop_performance.js - Real-World Performance
- ✅ Loop of 10 sets → 1 transaction with 10 triggers
- ✅ Proves dramatic performance improvement

## Foundation for Recording/Replay

With auto-batching complete, the library now has everything needed for recording/replay:
- ✅ Transaction IDs and timestamps
- ✅ Multiple triggers per transaction
- ✅ Explicit batching API
- ✅ Automatic batching for uncontrolled code
- ✅ Clean trace format for recording
