# Session Notes for Future LLM Work

This document captures context for future sessions working on Auto4.

## What Is This Project?

Auto4 is a state management library for chart applications. It's:
- A rewrite of the existing `@autolib/auto` library
- Built on the kernel/block architecture from `kernels/auto3`
- Designed for two specific apps: `prices-app` and `trade-portal-app-v2`

## Repository Structure

```
/Users/karl/autojs/
├── auto-es6.js           # Current production library
├── tests/
│   ├── runall.js         # Test runner for old format
│   └── files/            # 66 existing tests (old format)
├── kernels/
│   ├── auto3/            # Previous experimental version
│   │   ├── kernel.js     # Core intent router
│   │   ├── graph.js      # Reactive handlers
│   │   ├── block.js      # Block composition
│   │   ├── auto.js       # Convenience wrapper
│   │   └── tracer.js     # Execution tracing
│   └── auto4/            # THIS VERSION
│       ├── README.md     # Main overview
│       ├── ARCHITECTURE.md
│       ├── APPS-ANALYSIS.md
│       ├── CHART-OBJECT.md
│       ├── MIGRATION.md
│       ├── TESTS-PLAN.md
│       ├── SESSION-NOTES.md  # This file
│       ├── src/
│       │   ├── kernel.js     # Copied from auto3
│       │   ├── graph.js
│       │   ├── block.js
│       │   ├── auto.js
│       │   ├── tracer.js
│       │   └── chart.js      # NEW - main API (placeholder)
│       └── tests/
│           ├── run.js        # Test runner
│           └── test-001 to test-010

../prices-app/             # Target app 1
../trade-portal-app-v2/    # Target app 2
```

## Key Concepts

### The Chart Object
- Central abstraction: "every time you init state, you're really initing a chart"
- URL-centric: `setUrl()` is the primary initialization
- Traceable: every change produces a trace
- Composable: made of blocks with needs/gives

### Blocks
- Composable units with explicit interfaces
- `needs`: what inputs a block requires
- `gives`: what outputs a block provides
- Auto-wiring connects blocks by matching names

### Tracing
- Three levels: data diff, flow diff, code diff
- Shows exactly how changes propagate
- Critical for debugging and testing

### URL Round-Trip
- The most important test
- Set URL -> change state -> get URL -> set URL -> no changes
- Validates bidirectional URL/state sync

## Target Applications

### prices-app
- Price charting for commodities
- Located at `../prices-app`
- Uses auto library with 7-stage data pipeline (lines_00 to lines_07)
- Main pain points: lines.js (312 lines), url.js (382 lines)

### trade-portal-app-v2
- Trade data visualization
- Located at `../trade-portal-app-v2`
- TypeScript, more complex state
- 10+ order-dependent modules with manual wiring
- Main pain points: data.ts (800+ lines), URL timing bug

## Current Status

### Done
- Documentation written (README, ARCHITECTURE, APPS-ANALYSIS, etc.)
- 10 test files created with progressive complexity
- Core files copied from auto3
- Placeholder chart.js created

### TODO
1. Implement chart.js methods
2. Wire blocks together properly
3. Add Svelte store bridge
4. Pass all 10 new-format tests
5. Pass all 66 old-format tests
6. Migrate prices-app
7. Migrate trade-portal-app-v2

## How to Continue Work

### Running Tests
```bash
# New format tests (will fail until chart.js is implemented)
cd kernels/auto4 && node tests/run.js

# Old format tests (for compatibility)
cd /Users/karl/autojs && node tests/runall.js
```

### Implementation Order
1. Start with test-001 (basic init)
2. Implement chart.js `isReady()` and basic lifecycle
3. Move to test-002 (URL parsing)
4. Implement `setUrl()` and `getUrl()`
5. Continue progressively

### Key Files to Read
- `kernels/auto4/CHART-OBJECT.md` - The Chart API in detail
- `kernels/auto4/ARCHITECTURE.md` - How layers work
- `kernels/auto3/kernel.js` - The core intent system
- `kernels/auto3/block.js` - How blocks work

## Common Questions

### Why not just use Svelte stores?
Both apps already use auto library. The goal is to improve it, not replace with something fundamentally different.

### Why blocks instead of one big state object?
- Explicit interfaces (needs/gives) make dependencies clear
- Easier to test individual blocks
- Can trace data flow between blocks
- Matches how the apps are mentally organized

### What about performance?
The kernel/dispatch system adds overhead. This should be measured. If too slow, can optimize hot paths or fall back to direct calls.

### How does Svelte integration work?
The `['#']` accessor returns Svelte-compatible stores. Each state value becomes a store you can subscribe to.

## Debugging Tips

1. **Enable tracing**: `createChart({ tracer: true })`
2. **Check traces**: `chart.getTrace()` after each operation
3. **Inspect blocks**: `chart.components.urlParser.state`
4. **Run single test**: `node tests/run.js test-001`

## Contact

This is Karl's personal project for work applications.
