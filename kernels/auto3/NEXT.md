# Next: Diff as a Core Principle

## claude summary

Where the diff layer goes: The kernel's transform system is the natural hook point. Every intent passes through transforms, so you can record everything there without changing the core architecture.

  Three levels of diffing:
  1. Data diff - what values changed (we have this via reactive deps)
  2. Flow diff - did the execution path change (need to record traces)
  3. Code diff - did handler code change (need to hash handlers)

  Why the architecture is already diff-friendly:
  - Everything is an intent (name + value) - serializable, hashable
  - Policies are declarative - comparable
  - Flow is explicit via dispatch - traceable

  Suggested first step: A simple tracer.js that uses the transform system to record all intents without modifying the core. Then you can compare traces across runs and see what changed.

  The write-up includes code sketches for hashing handlers, recording execution traces, and diffing runs.

## The Vision

The entire point of this architecture is **change detection**. Not just "did the data change" but:

- Did the code change?
- Did the flow change?
- What will this code change affect?

The goal: *"Hey, this code change you did here is going to change the way this behaves, and I know this because I'm running this through the data usage we are recording and the flow changes here, here and here."*

## What We Have Now

```
kernel.js   →  policy engine (immediate/deferred/dispatch)
graph.js    →  reactive handlers (get/set/run/invalidate)
auto.js     →  single block with $.x syntax
block.js    →  composable blocks with needs/gives/wiring
```

The kernel routes intents via policies. Blocks wire together via dispatch. Data flows through the graph.

## What We Want

Three levels of diffing:

### 1. Data Diff
When a value changes, what else changes?

```
Input: url = "https://api.com/users"
       ↓
Flow:  url → host → endpoint → data → rendered
       ↓
Output: diff = {
    host: null → "api.com",
    endpoint: null → "https://api.com/api",
    data: null → [...],
    rendered: null → "<svg>..."
}
```

We partially have this via the reactive graph - we know what depends on what.

### 2. Flow Diff
Given the same input, did the execution path change?

```
Before: url → host → endpoint
After:  url → host → port → endpoint  (new 'port' block added)

Flow diff: {
    added: ['port'],
    removed: [],
    changed_edges: [
        { from: 'host', to: 'endpoint' } → { from: 'host', to: 'port' }
    ]
}
```

This requires recording the actual execution trace, not just the dependency graph.

### 3. Code Diff
Did the handler/policy code change? What's affected?

```
Before: host: ($) => new URL($.url).host
After:  host: ($) => new URL($.url).hostname  // .host → .hostname

Code diff: {
    changed: ['host'],
    hash_before: 'a1b2c3',
    hash_after: 'd4e5f6',
    affected_downstream: ['endpoint', 'data', 'rendered']
}
```

This requires hashing handlers and tracking which blocks use them.

## Where Does This Layer Go?

Option A: **Inside the Kernel (Transforms)**

```js
kernel({
    transforms: [
        traceTransform,   // records all intents
        diffTransform,    // compares to previous run
    ]
})
```

Transforms see every intent before routing. They could:
- Record the full trace
- Hash each intent
- Compare to previous traces

Option B: **Wrapper Around Blocks**

```js
let traced = tracedBlock(myBlock);
// traced.history = all past executions
// traced.diff(run1, run2) = what changed
```

Each block maintains its own history. Diffing happens at block level.

Option C: **Separate Trace Layer**

```
┌─────────────────────────────────────────┐
│  tracer.js - records everything         │
├─────────────────────────────────────────┤
│  block.js - composable blocks           │
├─────────────────────────────────────────┤
│  graph.js - reactive handlers           │
├─────────────────────────────────────────┤
│  kernel.js - policy engine              │
└─────────────────────────────────────────┘
```

A dedicated layer that wraps kernels and records:
- Every intent that flows through
- Every policy decision
- Every handler execution
- Hashes of all handlers

## Hashing Handlers/Policies

To detect code changes, we need stable hashes:

```js
function hashHandler(handler) {
    if (typeof handler === 'function') {
        return md5(handler.toString());
    }
    return md5(JSON.stringify({
        policy: handler.policy,
        code: handler.handler.toString()
    }));
}

function hashBlock(block) {
    return md5(JSON.stringify({
        needs: block.needs,
        gives: block.gives,
        handlers: Object.entries(block.handlers)
            .map(([name, h]) => [name, hashHandler(h)])
    }));
}
```

When a block's hash changes, we know its code changed.

## Recording Execution

Every run produces a trace:

```js
{
    id: 'run-001',
    timestamp: 1234567890,
    input: { url: 'https://api.com/users' },
    output: { rendered: '<svg>...' },

    // The full intent log
    intents: [
        { name: 'set', value: { target: 'url', val: '...' }, policy: 'deferred' },
        { name: 'run', value: 'host', policy: 'deferred' },
        { name: 'output', value: { target: 'host', val: 'api.com' }, policy: 'dispatch' },
        // ...
    ],

    // Handler hashes at time of run
    hashes: {
        'blockA.host': 'a1b2c3',
        'blockA.path': 'd4e5f6',
        'blockB.endpoint': 'g7h8i9',
    }
}
```

## Diffing Runs

```js
function diffRuns(run1, run2) {
    return {
        // Data diff
        data: {
            changed: ['host', 'endpoint'],
            added: [],
            removed: []
        },

        // Flow diff
        flow: {
            same_path: false,
            intents_added: [...],
            intents_removed: [...],
            intents_changed: [...]
        },

        // Code diff
        code: {
            handlers_changed: ['blockA.host'],
            affected_downstream: ['endpoint', 'data', 'rendered']
        }
    };
}
```

## The Key Insight

The kernel already sees every intent. The routing function already makes every policy decision. We just need to **record** these decisions and **compare** them across runs.

The architecture is already diff-friendly because:
1. Everything is an intent (name + value) - easy to serialize/hash
2. Policies are declarative - easy to compare
3. Flow is explicit via dispatch - easy to trace

## Questions to Resolve

1. **Granularity**: Diff at intent level? Block level? System level?

2. **Storage**: Where do traces live? In memory? Persisted?

3. **Identity**: How do we identify "the same run" across code changes?

4. **Performance**: Recording everything has overhead. Optional? Sampled?

5. **Presentation**: How do we show diffs to the developer? CLI? UI? IDE integration?

## Possible First Step

Add a simple trace transform to the kernel:

```js
function createTracer() {
    let traces = [];

    return {
        transform: (intent, state, sig) => {
            traces.push({
                timestamp: Date.now(),
                intent: { ...intent },
                stateSnapshot: { ...state.cache }
            });
            return intent;  // pass through unchanged
        },

        getTraces: () => traces,
        clear: () => { traces = []; },

        diff: (fromIndex, toIndex) => {
            // Compare trace segments
        }
    };
}
```

Then use it:

```js
let tracer = createTracer();

let k = kernel({
    transforms: [tracer.transform],
    // ...
});

// After some operations
console.log(tracer.getTraces());
```

This gives us visibility into what's happening without changing the core architecture.

## Summary

The diff layer sits on top of everything, observing:
- What intents flow through (data diff)
- What path they take (flow diff)
- What code processes them (code diff)

The kernel's transform system is the natural hook point. Every intent passes through transforms, so we can record everything there.

Next session: implement `tracer.js` and see what traces look like for real block compositions.
