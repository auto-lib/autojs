# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Auto.js is a JavaScript reactivity library with a core principle: **reactivity without side effects**. Functions can READ state but never WRITE state. This distinguishes it from other reactive libraries like MobX or RxJS.

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,  // dynamic - computed from other values
    msg: ($) => $.data + " has " + $.count + " items"
});
$.data = [1,2,3];  // static - set from outside
console.log($.msg);  // "1,2,3 has 3 items"
```

## Commands

### Running Tests
```bash
cd tests && node runall.js           # Run all tests
cd tests && node runall.js 005_dependent_function.js  # Run single test
```

### Testing with Deno (ES6)
```bash
deno run test.js
```

### Debugging Blocks Kernel with Prices-App MCP Server

**Context**: The blocks kernel (`/kernels/blocks/`) is symlinked into the prices-app (`/Users/karl/prices-app`) for production testing. When working on the blocks kernel in this project, you often need to see console errors from the running prices-app.

**🚨 CRITICAL: MCP SERVER ISSUES ARE ALWAYS TOP PRIORITY 🚨**

If the MCP server tools (`mapped_console_refresh`, `mapped_console_tail`, etc.) are not working:

1. **STOP IMMEDIATELY** - This is a critical blocker, more important than any other debugging task
2. **NEVER suggest workarounds** like "I can read the logs directly" - this misses the point
3. **DEBUG THE ROOT CAUSE** - Why isn't the MCP server working? What broke the connection?
4. **FIX IT PERMANENTLY** - Don't just restart processes, understand and solve the underlying issue
5. **IMPROVE THE TOOLING** - If the MCP server is unreliable, fragile, or hard to use, fix that too

Questions to investigate when MCP tools fail:
- Why did the MCP server disconnect?
- Why isn't the heartbeat mechanism working?
- Why don't the tools persist across sessions?
- What changes can make this more reliable?
- How can we make browser log access cleaner and easier to use?

The MCP server is infrastructure - if it's broken, nothing else matters. Fix it first.

**Setup** (completed 2025-12-30):
- Created `.mcp.json` in this project pointing to prices-app's MCP server with `cwd: "/Users/karl/prices-app"`
- Set `enableAllProjectMcpServers: true` in `.claude/settings.local.json`
- The MCP server (`mapped-console`) runs in prices-app and monitors `localhost:3000` via Chrome DevTools Protocol
- **IMPORTANT**: After modifying `.mcp.json`, restart Claude Code for changes to take effect

**Usage** (after Claude Code restart):
```
# Check for console errors in the running prices-app
Use the mapped_console_refresh MCP tool

# View existing logs without reload
Use the mapped_console_tail MCP tool

# Other available tools:
- mapped_console_reload - Reload the page
- mapped_console_clear - Clear logs
- mapped_console_navigate - Navigate to URL
- mapped_console_ping - Check CDP server health
```

**How it works**:
1. Prices-app dev server runs on `localhost:3000` (started with `cd /Users/karl/prices-app/build && npm run dev_local_api`)
2. CDP server (`cdp-console-jsonl.mjs`) runs headless Chromium watching the app
3. MCP server (`mapped-console-mcp.mjs`) provides tools to Claude Code
4. Logs written to `/Users/karl/prices-app/mcp/.claude/mapped-console.jsonl`

**Current status** (2026-01-03):
- ✅ MCP server configured and running
- ✅ Blocks kernel version: `blocks-0.1.0`
- ✅ Blocks kernel symlinked at `/Users/karl/prices-app/build/node_modules/@autolib/auto`
- ✅ **FIXED**: MCP server now uses absolute paths (2026-01-03)
- ⚠️ **KNOWN ISSUE**: MCP tools may become unavailable mid-session - requires Claude Code restart
- 🔄 **IN PROGRESS**: Verifying blocks kernel works correctly with prices-app

**🚨 CRITICAL - NEVER ASSUME IT'S WORKING 🚨**:

**RULE**: Console logs alone DO NOT confirm the app is working. You MUST verify:

1. **Component Load Tracing** - Track which components are loading:
   - Simple `console.log('✅ ComponentName.svelte loaded')` at top of each component's `<script>` tag
   - **NO onMount()** - just direct console.log to see script execution
   - Check logs to see how far the app gets before failing
   - Key components to track:
     - `App.svelte` - Root component
     - `Portal.svelte` - Main layout
     - `UsWholesale.svelte`, `Shrimp.svelte`, `Salmon.svelte`, `Groundfish.svelte` - Tab components
   - If a component's log doesn't appear, it failed to load (check for errors before that point)

2. **No Fatal Errors** - Console must be free of errors:
   - Check for stack traces, "fatal error", "undefined", etc.
   - MCP tools can show errors but not prove absence of errors
   - Use `grep -E '"type":"(console.error|console.trace)"' /Users/karl/prices-app/mcp/.claude/mapped-console.jsonl`

3. **Reactive Updates Work** - User interactions must trigger updates:
   - Click buttons, change dropdowns, interact with charts
   - Verify UI actually updates in response to interactions
   - No need for verbose logs - just verify behavior works

4. **Visual Confirmation** - The app must render correctly:
   - Charts display
   - Data loads
   - Navigation works
   - No blank screens or missing components

**What "working" means**:
- ✅ All expected component logs appear in order
- ✅ No console errors
- ✅ User interactions trigger UI updates
- ✅ Charts and data render correctly

**What "working" does NOT mean**:
- ❌ Just seeing some console.log messages
- ❌ No errors in the first 2 seconds (errors can happen later!)
- ❌ "It compiled successfully" (compilation ≠ runtime success)
- ❌ Verbose resolver logs (we removed these - too noisy)

**Tracing Strategy**:
- Add simple logs to Svelte components to trace execution flow
- Logs show which components loaded successfully
- Missing logs indicate where execution stopped (check for errors before that point)
- Keep logs minimal - just component names, no detailed state

**⚠️ IMPORTANT - Verifying Fresh Logs**:

When checking for errors, **ALWAYS verify logs are fresh** using these checks:

1. **Check log file timestamps**:
   ```bash
   ls -la /Users/karl/prices-app/mcp/.claude/mapped-console.jsonl
   # Look at modification time - should be recent
   ```

2. **Check log entry timestamps** (most important):
   ```bash
   tail -5 /Users/karl/prices-app/mcp/.claude/mapped-console.jsonl
   # Compare "ts" field to current UTC time
   node -e "console.log('Current UTC:', new Date().toISOString())"
   ```

3. **Check heartbeat is active**:
   ```bash
   cat /Users/karl/prices-app/mcp/.claude/mcp-heartbeat.json
   # Timestamp should be within last 30 seconds
   ```

**Known Issues (FIXED 2025-12-30)**:
- ❌ **Bug**: CDP server was filtering out `console.trace()` events
  - Line 201 only captured: `["error", "warning", "log"]`
  - Missing: `"trace"` - which is what fatal errors use
  - **Fix**: Added `"trace"` to the event filter in `cdp-console-jsonl.mjs`
- ⚠️ **Lesson**: If real browser shows errors but CDP doesn't, check:
  1. Are logs fresh? (timestamps current?)
  2. Is the error type being filtered? (check event type filters)
  3. Is the headless browser in a different state? (user interaction needed?)

**Root Cause Analysis** (2026-01-03):

*Problem*: MCP tools were not available in Claude Code sessions despite MCP server being configured and "connected."

*Investigation findings*:
1. ✅ `.mcp.json` configured correctly with `cwd: "/Users/karl/prices-app"`
2. ❌ **BUG**: Claude Code does NOT respect the `cwd` parameter in `.mcp.json`
   - MCP server ran from `/Users/karl/autojs/` instead of `/Users/karl/prices-app/`
   - Relative paths in MCP server resolved to wrong directory
3. ❌ Heartbeat file writes failed silently (wrong directory)
   - MCP server tried to write to `/Users/karl/autojs/mcp/.claude/mcp-heartbeat.json`
   - Directory doesn't exist, writes failed, heartbeat went stale
4. ❌ CDP server wouldn't run without fresh heartbeat
5. ❌ MCP tools became unavailable mid-session

*Root cause*:
- **Claude Code bug**: `.mcp.json` `cwd` parameter is ignored when spawning MCP servers
- **MCP server design**: Used relative paths assuming correct working directory
- **Silent failure**: Heartbeat writes failed silently instead of logging errors

*Fix implemented* (2026-01-03):
Modified `/Users/karl/prices-app/mcp/mapped-console-mcp.mjs` to use **absolute paths**:
- Uses `import.meta.url` to resolve script location
- Calculates `PRICES_APP_ROOT` as `path.resolve(__dirname, "..")`
- All file paths now absolute: `path.join(PRICES_APP_ROOT, "mcp/.claude/...")`
- CDP server spawn uses absolute paths and explicit `cwd`
- Works regardless of where MCP server process is started from

*Verification*:
```bash
cat /Users/karl/prices-app/mcp/.claude/mcp-heartbeat.json
# Heartbeat should be < 30 seconds old (FRESH)
node -e "console.log('Age:', Date.now() - $(cat /Users/karl/prices-app/mcp/.claude/mcp-heartbeat.json | jq -r '.ts'), 'ms');"
```

*Known limitation*:
Even with fix, MCP tools may become unavailable mid-session due to Claude Code session state issues. **Restart Claude Code** if tools stop working.

**Recommendations for Future Improvements**:

1. **Better error handling** in MCP server:
   - Log heartbeat write failures to stderr instead of silently failing
   - Add startup health check that verifies file paths are writable
   - Emit diagnostic messages when paths don't exist

2. **Alternative registration method**:
   - Consider using global MCP registration instead of `.mcp.json`:
     ```bash
     cd /Users/karl/prices-app
     claude mcp add --transport stdio mapped-console -- node mcp/mapped-console-mcp.mjs
     ```
   - Global registration may be more reliable than project-level `.mcp.json`

3. **Monitoring improvements**:
   - Add health check endpoint that shows:
     - Heartbeat age
     - CDP server status
     - Log file size/age
     - Working directory verification
   - Make it easy to diagnose issues without deep debugging

4. **Documentation**:
   - Update `/Users/karl/prices-app/mcp/readme.md` to document:
     - The `cwd` bug in Claude Code's `.mcp.json` handling
     - The absolute path fix implemented
     - How to verify MCP server is healthy
     - Common failure modes and how to diagnose them

*Alternative solution created*:
- Created `/Users/karl/autojs/watch-errors.mjs` as independent monitoring script
- Works without MCP by reading log file directly and sending control commands
- Usage:
  ```bash
  node watch-errors.mjs          # One-time check (auto-reloads page)
  node watch-errors.mjs --follow # Real-time error monitoring
  ```
- Can be used as workaround if MCP connection can't be established
- Should be deleted once MCP tools are working

**Common workflow** (once MCP tools are working):
1. User sees errors in prices-app browser
2. Use `mapped_console_refresh` to capture errors in headless browser
3. Identify issue in blocks kernel code (`/kernels/blocks/src/`)
4. Fix the code, test passes
5. Verify fix in prices-app using MCP tools

## Architecture

### Core Files
- `auto-es6.js` - Main library (ES6 module export)
- `auto-commonjs.js` - CommonJS version for Node
- `auto-no-export.js` - Browser version (no export)

All three are generated from `docs/development/devlog/src/0XX_*.js` (the latest numbered file) by `tests/runall.js`.

### Making Changes to the Library
**Important**: Never edit `auto-es6.js` directly. Changes are made by:
1. Find the latest numbered file in `docs/development/devlog/src/` (e.g., `051_deep_equal.js`)
2. Copy it to a new file with incremented number (e.g., `052_new_feature.js`)
3. Make your changes in the new file
4. Run `cd tests && node runall.js` to generate the auto-*.js files and run tests

The test runner automatically copies the highest-numbered source file to the root auto files and updates the version in package.json.

### 8-Phase Propagation Cycle
When a value changes, propagation occurs in these phases:
1. **Invalidate** - Find all affected dependents recursively
2. **Topological Sort** - Order by dependencies
3. **Capture Old Values** - For change detection
4. **Clear Values** - Mark for recomputation
5. **Recompute** - Execute functions in order
6. **Detect Changes** - Compare old vs new
7. **Build Trace** - Record transaction metadata
8. **Notify Subscriptions** - Run callbacks

### Key Internal State
```js
$._  // Access internal state
// Contains: { fn, deps, value, subs, fatal }
```

### Test Structure
Tests in `tests/files/` validate both behavior AND internal state:
```js
export default {
    obj: { data: null, count: ($) => $.data?.length ?? 0 },
    fn: ($) => { $.data = [1,2,3] },
    _: {
        fn: ['count'],
        deps: { count: { data: true } },
        value: { data: [1,2,3], count: 3 },
        fatal: {}
    }
}
```

**Test Categories**: See `/docs/status/TEST-CATEGORIES.md` for complete categorization:
- ✅ Core Behavior (~30) - Essential for all kernels
- 🟡 Implementation (~15) - v0.54 internals, can use adapter
- 🟢 Performance (~20) - Batching, change detection
- 🟣 Debugging (~3) - Root cause, tracing
- 🟠 Experimental (~1) - Recording

### Kernels Directory - Architectural Exploration
`kernels/` contains experimental alternative implementations exploring different architectural approaches for a potential 2.0 rewrite.

**Philosophy**: We're in the exploration phase - testing ideas, not committing to any single approach yet. The test suite is our specification; any kernel that passes it is a valid implementation.

**The Contract**: All kernels must pass the **75+ test suite** in `/tests/files/`. Tests validate both behavior AND internal state (`$._`), so kernels need either:
1. Compatible internal structure (fn, deps, value, subs, fatal), OR
2. **Adapter/mapper layer** that provides `$._` compatibility (RECOMMENDED)

**Status Tracking**: See `/docs/status/KERNELS.md` for current test pass rates and development status of each kernel.

**Active Kernels**:
- **graph-first** (`/kernels/graph-first/`) - Immutable graph structure approach. Most recent activity.
- **channel** (`/kernels/channel/`) - Signal-based message queue. Passes ~15/75 tests (20%). Minimal 65-line core.
- **auto4** (`/kernels/auto4/`) - Chart-centric design for visualization apps. Design phase.
- **auto2/auto3** - Earlier explorations, historical reference.

**Working with Kernels**:
```bash
# Run tests for a specific kernel (if has own runner)
cd kernels/channel && node run.js

# Run full test suite (requires $._  compatibility layer)
cd tests && node runall.js

# Update status dashboard when test pass rates change
# Edit: /docs/status/KERNELS.md
```

**Key Resources**:
- `/kernels/README.md` - Philosophy & overview of all 8+ kernel approaches
- `/kernels/COMPARISON.md` - Detailed feature matrix & evaluation criteria
- `/docs/status/KERNELS.md` - Current test pass rates & development status
- `/docs/status/TEST-CATEGORIES.md` - Test categorization (essential vs optional)

## Key Invariants

1. **No side effects**: Functions never write to state - attempting this triggers `fail()`
2. **No circular dependencies**: Detected at runtime via call stack
3. **Topological ordering**: Dependencies always compute before dependents
4. **Single source of truth**: Static vars set externally, dynamic vars only by their functions

## Options
```js
auto(obj, {
    trace: (t) => {},                // Transaction callback
    watch: { varName: true },         // Debug logging for specific vars
    tag: 'my-app',                    // Log prefix
    deep_log: false,                  // Verbose logging
    auto_batch: true,                 // Auto-batch rapid sets (default: true)
    deep_equal: true,                 // Use deep equality for objects (default: true)

    // Excessive calls detection (for catching infinite loops)
    max_calls_per_second: 10,         // Threshold for excessive calls (default: 10)
    call_rate_grace_period: 3000,     // Grace period after boot in ms (default: 3000)
    excessive_calls_exclude: {        // Variables to exclude from checks
        mousei: true,                  // e.g., mouse position
        scrollY: true                  // e.g., scroll position
    }
});
```

## Documentation Navigation

This repository contains **40+ markdown files** organized by audience and purpose. Documentation was reorganized on 2025-12-26 for clarity.

### Structure

```
/docs/
├── user/              # For people USING auto.js (6 files)
├── concepts/          # Understanding reactivity & philosophy (5 files)
├── development/       # For maintainers & contributors (7 files + devlog)
├── experiments/       # Research, exploration, analysis (ideas, notes, archive)
└── status/            # Project tracking (KERNELS.md, STRUCTURE.md)
```

**Full structure reference**: `/docs/status/STRUCTURE.md`

### Quick Reference

**For users learning auto.js**:
- Start: `/docs/user/getting-started.md`
- Tutorial: `/docs/user/tutorial.md`
- API: `/docs/user/api-reference.md`
- Advanced: `/docs/user/advanced-features.md`

**Understanding reactivity concepts**:
- What: `/docs/concepts/what-is-reactivity.md`
- Why: `/docs/concepts/why-reactivity-matters.md`
- How: `/docs/concepts/how-auto-works.md`

**For contributors/maintainers**:
- Architecture: `/docs/development/architecture.md`
- Internals: `/docs/development/internals.md`
- Source: `/docs/development/devlog/src/054_circular_reference_protection.js` (latest)

**Project tracking**:
- Kernels: `/docs/status/KERNELS.md` - Test progress dashboard
- Tests: `/docs/status/TEST-CATEGORIES.md` - Test categorization & guidance
- Structure: `/docs/status/STRUCTURE.md` - Documentation organization
- Todo: `/docs/development/todo.md` - Task tracking

**Experimental work**:
- Ideas: `/docs/experiments/ideas/`
- Notes: `/docs/experiments/notes/`
- Analysis: `/docs/experiments/analysis/`

**When helping with documentation**:
- Check `/docs/status/KERNELS.md` for kernel progress before suggesting architecture changes
- Reference `/docs/development/architecture.md` for understanding the current production system
- Look at `/docs/development/devlog/src/054_*.js` (latest) to see actual implementation
- Don't edit auto-*.js files directly - they're auto-generated
- See `/docs/status/STRUCTURE.md` for complete file listing and navigation guide

## Development Workflow

### Iterative Kernel Development Process

The project is in an **exploration phase** - experimenting with different architectures without committing to one yet.

**Typical workflow**:
1. **Idea** - New architectural approach identified
2. **Kernel creation** - Create `/kernels/new-approach/` directory
3. **Documentation** - Write README.md explaining philosophy
4. **Prototype** - Implement core features
5. **Testing** - Run against test suite, track pass rate in `/docs/status/KERNELS.md`
6. **Iteration** - Refine based on test failures
7. **Compatibility** - Add `$._` adapter layer if needed
8. **Evaluation** - Compare against other kernels using criteria in `/kernels/COMPARISON.md`

**Goal**: Find architecture(s) that:
- Pass all 75+ tests
- Have minimal, understandable core
- Enable easy feature extension
- Maintain clarity and debuggability

**Important**: Each kernel is independent. Don't assume one approach is "the winner" - we're exploring options.

### Making Changes to Production Library

**For v0.54 (current production)**:
1. Find latest in `/docs/development/devlog/src/` (currently 054_circular_reference_protection.js)
2. Copy to new file with incremented number (e.g., 055_new_feature.js)
3. Make changes in the new file
4. Run `cd tests && node runall.js` to generate auto-*.js and run tests
5. Test runner auto-updates version in package.json

**For kernel experiments**:
1. Work directly in `/kernels/your-kernel/` directory
2. Each kernel is self-contained
3. Update `/docs/status/KERNELS.md` when test pass rates change
4. Document design decisions in kernel's own README

## Purpose of the Rewrite

The kernel exploration is driven by **real pain points** in the current v0.54 implementation. Understanding these issues is critical for evaluating which kernels solve the right problems.

### Core Issues Being Addressed

**1. Performance Problems**
- **Issue**: Propagation can be inefficient, unnecessary recomputations
- **Solutions explored**:
  - Auto-batching (v0.47+) - Group rapid changes into single propagation
  - Deep equality checks (v0.51+) - Skip propagation if values haven't actually changed
- **Kernel impact**: Kernels must handle batching and change detection efficiently

**2. Simplicity / Complexity**
- **Issue**: Core implementation has grown complex (941 lines, 8 phases)
- **Goal**: Minimal, understandable core that's easy to reason about
- **Solutions explored**:
  - Signal-based kernel (channel) - 65-line core, features as handlers
  - Graph-first kernel - Separate graph topology from execution
- **Kernel impact**: Core size and clarity are key evaluation criteria

**3. Verifying Changes (Debugging)**
- **Issue**: Hard to understand why values changed, debug complex propagations
- **Solutions explored**:
  - Trigger history (v0.52+) - Track what triggered each computation
  - Root cause analysis (v0.53+) - Find original cause of change cascade
  - Recording system (v0.66+, recorder.cjs) - Record/replay state changes
- **Kernel impact**: Kernels need trace/debug infrastructure or adapter

**4. Simplifying User Code**
- **Issue**: Users need cleaner abstractions for common patterns
- **Solutions explored**:
  - Splitting into parts/boxes/channels - Modular reactive components
  - Chart objects (auto4 kernel) - Domain-specific abstractions
- **Kernel impact**: API ergonomics and composition patterns matter

### The Path Forward

The rewrite effort is moving from **exploration** to **purposeful iteration**. Focus areas:

**1. Test Clarity**
- **Goal**: Understand what each of the 75+ tests is actually validating
- **Reference**: `/docs/status/TEST-CATEGORIES.md` - Complete test categorization
- **Categories**:
  - ✅ Core Behavior (~30 tests) - Essential, all kernels must pass
  - 🟡 Implementation Details (~15 tests) - v0.54 internals, kernels can use adapter
  - 🟢 Performance Features (~20 tests) - Batching, change detection (v0.47+, v0.51+)
  - 🟣 Debugging Features (~3 tests) - Root cause, excessive calls (v0.52+, v0.53+)
  - 🟠 Experimental (~1 test) - Recording (v0.66+)
- **Action**: See TEST-CATEGORIES.md for detailed breakdown and guidance

**2. New Feature Testing**
- **Recording**: How to test record/replay? What guarantees does it need?
- **Performance features**: How to test batching, deep equality work correctly?
- **Debug features**: How to test trigger history, root cause analysis?
- **Action**: Write test specs for each feature, determine if they belong in core test suite

**3. Testing Vision: Diff-Based Change Analysis**

A new testing approach is emerging that treats tests as **transformation pipelines** with visual diff analysis:

**The Four-Part Structure**:
1. **URL** - External data source or API endpoint
2. **Data** - Input data (static or from URL)
3. **Code** - Reactive computation graph (auto.js code)
4. **Chart** - Output visualization or data structure

**The Testing Flow**:
```
URL + Data → Code → Chart₁
           ↓ (modify code)
URL + Data → Code' → Chart₂
           ↓ (analyze)
        Chart₁ ↔ Chart₂ (diff)
```

**Key Concepts**:
- **Graph Invariant**: Same input → same output (deterministic computation)
- **Diff-Driven Debugging**: Work backwards from chart diffs or forwards through code changes
- **Block Composition**: Split code into modular blocks/boxes with clear boundaries
- **Cross-Block Graphs**: Dependency graphs that span multiple blocks/modules
- **Signals as Connectors**: Use signals to wire blocks together and pass data between them

**Questions to Explore**:
- How to split reactive code into composable blocks?
- How to track which block's code/output changed?
- How to represent graphs that span block boundaries?
- What role do signals play in connecting blocks vs traditional reactive dependencies?
- How to visualize diffs at the graph level vs the data level?

**Kernel Direction**: See `/kernels/blocks/` for exploration of this approach.

**Real-World Context**: The blocks kernel is designed based on actual usage patterns in production charting apps:
- `/Users/karl/prices-app` - Commodity price charting
- `/Users/karl/trade-portal-app-v2` - Trade flow visualization

See `/kernels/blocks/archive/REAL-WORLD-USAGE.md` for detailed analysis of how auto.js is used in these apps, including:
- URL as state encoding (chart configuration)
- Data as external sources (API endpoints, JSON files)
- Reactive pipelines (URL → state → data → transforms → chart)
- Component composition patterns
- Bidirectional URL ⟷ State sync

**Note**: REAL-WORLD-USAGE.md references the old API and is archived. The actual implementation is simpler and focuses on core reactivity rather than diff-driven testing.

**Architecture** (`/kernels/blocks/`):

The blocks kernel implements a **simple, modular architecture**:

**Core Modules** (5 independent, testable parts):
1. **DirectedGraph** (`src/directed-graph.js`) - Pure directed graph structure (nodes, edges, topology)
2. **Static Analysis** (`src/static-analysis.js`) - Convert functions to dependency graph via toString/regex
3. **Blocks** (`src/blocks.js`) - Group functions with optional inputs/outputs, wiring between blocks
4. **Resolver** (`src/resolver.js`) - Execute functions to resolve stale values (replaces complex kernel)
5. **Auto** (`src/auto.js`) - Integration API for users

**Key Simplifications**:
- No complex kernel/signals - just a simple resolver that executes in topological order
- Static analysis only (toString/regex) - simpler than runtime tracking
- "Stale" instead of "dirty" for values that need recomputing
- Blocks + wiring combined into one module (less conceptual overhead)

**Design Questions** (see `/kernels/blocks/DESIGN-QUESTIONS.md`):
- Should Block and Cross-Block be separate or combined? → **Combined into blocks.js**
- Are inputs/outputs necessary? → **Optional** (validate when declared, flexible when not)
- How should wiring work? → **Explicit wires + auto-wire helper**
- What should Resolver know about? → **Just graph + functions** (clean separation)

**Documentation**:
- `BIG-PICTURE.md` - **The complete story** (reactivity as graphs, Svelte integration, async handling, through-lines)
- `IMPLEMENTATION.md` - **Summary of completed implementation** (START HERE for code)
- `README.md` - Overview and quick start
- `QUICKSTART.md` - Getting started guide with examples
- `DESIGN-QUESTIONS.md` - Design exploration and decisions
- `ARCHITECTURE-SIMPLE.md` - Clean, modular architecture specification (design doc)
- `TESTING.md` - Test suite documentation
- `INTEGRATION-TESTS.md` - **Integration tests for async propagation** (debugging real-world patterns)
- `PROMISE-HANDLING_ANALYSIS.md` - Promise handling analysis (why fixes were needed, alternatives)
- `/kernels/PRODUCTION-READINESS.md` - **Lessons from production integration** (async propagation, circular dependencies, testing gaps)
- `archive/ARCHITECTURE.md` - Deep dive into alternatives explored (archived)
- `archive/REAL-WORLD-USAGE.md` - Production app analysis, old API (archived)

**Status**: ✅ **Implementation complete & production-tested** (2025-12-30)
- 5 modules implemented and tested (see `src/`)
- 51 tests passing (100%) - 29 module tests + 22 integration tests
- ✅ **Real-world validation** - Tested against production Svelte app (prices-app)
- All design decisions from DESIGN-QUESTIONS.md implemented
- Documentation updated to match implementation (2025-12-29)
- Old source files removed (kernel.js, graph.js, block.js)
- Outdated docs archived

**Async Propagation Fixes** (2026-01-03):
- Fixed Promise detection: Promises now stored in values so dependents can detect pending state
- Fixed execution order: Functions skip execution if dependencies are stale or Promises
- Created 4 integration tests to capture real-world async patterns (`tests/integration/`)
- Run tests: `cd kernels/blocks && node run-integration-tests.js`
- See `INTEGRATION-TESTS.md` for detailed analysis and root cause findings

**Real-World Integration Fixes** (2025-12-30):
- Added options parameter support (`tag`, `watch`, `excessive_calls_exclude`)
- Added `.v` version property for debugging
- Fixed static analysis regex to avoid false circular dependency detection
- Added Svelte store API compatibility (`.subscribe()`, `.set()`, `.update()`)
- Added immediate subscription callbacks (required for Svelte reactivity)
- Made `$['#']` enumerable for component state initialization
- See `/kernels/blocks/README.md` for complete details

**4. Kernel Evaluation Criteria**
When evaluating kernels, ask:
- Does it solve the **performance** issues? (batching, change detection)
- Is it **simpler** than v0.54? (core size, understandability)
- Does it support **debugging** features? (tracing, recording)
- Does it enable **user code simplicity**? (good abstractions, composability)
- Does it pass all **essential tests**? (core behavior, not just v0.54 internals)

### Current Development Focus

**Immediate**:
- Gaining clarity on existing tests - categorizing by purpose
- Understanding which tests are essential vs implementation-specific
- Documenting new features (recording, tracing) and their test requirements
- Expanding blocks kernel test coverage (subscriptions, circular deps, async)

**Active Kernels**:
- **blocks** (newest) - ✅ Complete & production-tested: 5 simple modules, 51 tests passing, ~600 LOC vs 941 in v0.54
- **graph-first** - Explores simplicity through immutable graph structure
- **channel** - Explores simplicity through 65-line signal core

**Philosophy**:
- Moving from exploration to purposeful iteration
- Each kernel must solve real pain points, not just pass tests
- Test suite needs clarity - what's core behavior vs v0.54 implementation details
- Testing approach should enable understanding changes (diff-driven debugging)
