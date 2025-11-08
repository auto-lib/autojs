# Auto.js: Organization & Feature Set Brainstorming

Based on comprehensive analysis of the current structure, here are recommendations for better organization and potential future directions.

---

## Current State Assessment

### What Works Exceptionally Well

1. **Version-Based Evolution** (001-049)
   - Each version is a clear, testable checkpoint
   - Shows the "why" behind architectural decisions
   - Great for learning progression
   
2. **Internal State Testing**
   - Tests validate the contract, not just outputs
   - Catches refactoring issues immediately
   - Documents expected behavior

3. **Explicit Architecture**
   - 8-phase cycle is clear and documented
   - Phases are now separate, named functions
   - Perfect for instrumentation

4. **Comprehensive Documentation**
   - ARCHITECTURE.md explains everything
   - PROJECT_SUMMARY.md provides overview
   - Multiple explanation attempts (ok-but-what-is-auto.md)

### Current Gaps

1. **Feature Discovery**
   - No index: "where are all async tests?"
   - Have to know version numbers to find related code
   - Feature documentation scattered across multiple locations

2. **API Reference**
   - No quick reference for all methods
   - Options not centrally documented
   - Special functions (#fatal, #trace) scattered in docs

3. **Integration Guide**
   - No "getting started" for new users
   - No "here's how to add a feature" guide
   - Recorder system not well integrated

4. **Performance Information**
   - No tuning guide
   - Auto-batch defaults not clearly explained
   - Change detection strategy not obvious

---

## Proposed Organization Structure

### Option A: Minimal Addition (Non-Breaking)

Add new top-level files without reorganizing existing content:

```
docs/
├── ARCHITECTURE.md                  (existing - excellent)
├── API_REFERENCE.md                 (NEW - quick lookup)
├── GETTING_STARTED.md               (NEW - intro for newcomers)
├── PERFORMANCE_TUNING.md            (NEW - optimization guide)
├── FEATURE_INDEX.md                 (NEW - feature → file mapping)
├── PROJECT_SUMMARY.md               (existing)
│
├── devlog/
│   ├── src/                         (existing - 49 versions)
│   ├── doc/                         (existing - feature notes)
│   └── readme.md                    (existing)
│
├── guides/                          (NEW - organized tutorials)
│   ├── async-functions.md
│   ├── batching.md
│   ├── change-detection.md
│   ├── error-handling.md
│   └── record-playback.md
│
└── [other existing folders unchanged]
```

**Advantages**:
- Doesn't touch existing structure
- Backward compatible
- Incremental improvement
- Can add when needed

**Disadvantages**:
- Duplication of information
- Two sources of truth

### Option B: Feature-Based Organization

Reorganize around features:

```
docs/
├── concepts/
│   ├── what-is-auto.md
│   ├── static-vs-dynamic.md
│   ├── reactivity.md
│   └── one-function-one-value.md
│
├── features/
│   ├── dependency-tracking/
│   │   ├── overview.md
│   │   ├── src/  → symlink to 004-010
│   │   ├── tests/ → symlink to 004-009
│   │   └── examples.md
│   │
│   ├── circular-detection/
│   │   ├── overview.md
│   │   ├── src/ → 011
│   │   ├── tests/ → 010-014
│   │   └── examples.md
│   │
│   ├── async-functions/
│   │   ├── overview.md
│   │   ├── src/ → 026, 039-040
│   │   ├── tests/ → 031-032, 041-042
│   │   └── api.md
│   │
│   ├── batching/
│   │   ├── overview.md
│   │   ├── explicit-batch.md
│   │   ├── auto-batch.md
│   │   ├── src/ → 044-047
│   │   ├── tests/ → 049-059
│   │   └── performance.md
│   │
│   └── [more features...]
│
├── architecture/
│   ├── ARCHITECTURE.md
│   ├── 8-phase-cycle.md
│   ├── data-structures.md
│   ├── invariants.md
│   └── key-algorithms.md
│
├── guides/
│   ├── getting-started.md
│   ├── building-objects.md
│   ├── performance-tuning.md
│   ├── debugging.md
│   └── extending.md
│
├── evolution/
│   ├── devlog/src/ (unchanged)
│   ├── devlog/doc/ (unchanged)
│   └── lessons-learned.md
│
└── api/
    ├── reference.md
    ├── auto().md
    ├── batch().md
    ├── add_static().md
    ├── add_dynamic().md
    ├── subscribe().md
    └── options.md
```

**Advantages**:
- Feature-centric navigation
- Easy to find related code/tests/docs
- Scalable for new features
- Clear API organization

**Disadvantages**:
- Major reorganization
- Breaking existing links/references
- Symlinks (if used) might be fragile

### Option C: Hybrid Approach (Recommended)

Keep devlog structure as "source of truth" but add curated guides:

```
docs/
├── START_HERE.md                    (NEW - entry point)
│
├── FEATURE_MAP.md                   (NEW)
│   "Async? See 026, 039-40, tests 031-32"
│   "Batching? See 044-47, tests 049-59"
│   [feature-to-version mapping]
│
├── API_REFERENCE.md                 (NEW - quick lookup)
│   auto(obj, options)
│   .batch(fn)
│   .add_static(vars)
│   .add_dynamic(vars)
│   .subscribe(varName, callback)
│   Special functions: #fatal, #trace
│
├── ARCHITECTURE.md                  (existing - excellent)
│
├── devlog/                          (existing - unchanged)
│   ├── src/001-049.js
│   ├── doc/...
│   └── readme.md
│
├── guides/                          (NEW - curated tutorials)
│   ├── getting-started.md
│   ├── async-functions.md
│   ├── batching-strategies.md
│   ├── change-detection.md
│   ├── record-playback.md
│   └── performance-tuning.md
│
└── [other existing unchanged]
```

**Why This Works Best**:
- ✅ Preserves devlog (valuable for understanding evolution)
- ✅ Adds navigation aids (FEATURE_MAP, START_HERE)
- ✅ Provides curated guides for specific use cases
- ✅ No breaking changes
- ✅ Can be done incrementally
- ✅ Multiple entry points (evolution learner vs quick ref user)

---

## Detailed Recommendations

### 1. Create START_HERE.md

```markdown
# Getting Started with Auto.js

## What is This?
Auto.js is a reactive state library focusing on:
- Automatic dependency tracking
- Pure functions (read-only, no side effects)
- Guaranteed consistency through topological ordering

## I want to...

### Understand the core concepts
→ Read ARCHITECTURE.md (comprehensive overview)

### Get a quick API reference
→ Read API_REFERENCE.md

### Learn async functions
→ Read guides/async-functions.md
→ See devlog/src/026, 039-40
→ Run tests/files/031-32, 041-42

### Understand batching
→ Read guides/batching-strategies.md
→ See devlog/src/044-47
→ Run tests/files/049-59

[more topics...]

### Trace the evolution
→ Start with devlog/src/001_basic_box.js
→ Read ARCHITECTURE.md's "Evolution Story"
```

### 2. Create FEATURE_MAP.md

```markdown
# Feature Index: Find Everything by Feature

## Core Features

### 1. Basic State Management
- **Concept**: Static vs Dynamic values
- **Source**: devlog/src/001-010.js
- **Tests**: tests/files/001-009.js
- **Docs**: ARCHITECTURE.md → Core Concept section

### 2. Circular Dependency Detection
- **Concept**: Call stack-based detection
- **Source**: devlog/src/011.js
- **Tests**: tests/files/010-014.js
- **Docs**: ARCHITECTURE.md → Key Invariants

### 3. Asynchronous Functions
- **Concept**: Promises + set() parameter
- **Source**: devlog/src/026.js, 039-40.js
- **Tests**: tests/files/031-32.js, 041-42.js
- **Docs**: docs/discussion/026_asynchronous_functions.md

[continue for all features...]
```

### 3. Create API_REFERENCE.md

```markdown
# API Reference

## auto(obj, options)
Create reactive state from a plain object.

### Parameters
- **obj**: Plain object with static and dynamic properties
- **options**: Configuration object (optional)

### Example
```javascript
let _ = auto({
    // Static - you control this
    data: [1, 2, 3],
    
    // Dynamic - computed automatically
    count: ($) => $.data.length,
    
    // Special functions
    '#fatal': ({ msg, stack, vars }) => {
        console.error('Fatal:', msg);
    }
});
```

### Returns
Proxy object with:
- All properties of obj
- .batch(fn) method
- .add_static(...) method
- .add_dynamic(...) method
- ._[.fn/.deps/.value/.subs] (internal state)

## Options

- **auto_batch** (boolean, default: true)
- **auto_batch_delay** (number, default: 0)
- **trace** (function, callback for each transaction)
- **watch** (object, debug specific variables)
- **tag** (string, prefix for logs)
- **tests** (object, pre-boot function tests)

[complete API...]
```

### 4. Create guides/async-functions.md

```markdown
# Async Functions Guide

## Why Async Functions?
Sometimes values depend on asynchronous operations:
- API calls
- Timers
- File I/O

## The Pattern
```javascript
let _ = auto({
    user: null,
    loading: true,
    user_data: ($, set) => {
        fetch(`/api/users/${$.user}`)
            .then(r => r.json())
            .then(data => set(data))
            .catch(e => set({ error: e }));
        
        return undefined;  // Initial value while loading
    }
});
```

## How It Works
1. Function receives `set` as second parameter
2. Can call `set(value)` to update its own value
3. Triggers propagation automatically
4. Tests: tests/files/031-32.js, 041-42.js
5. Deep dive: devlog/src/026.js

[complete guide...]
```

### 5. Create guides/batching-strategies.md

```markdown
# Batching Strategies

## Why Batch?
Multiple updates in quick succession?
- Without batching: N transactions, N propagations
- With batching: 1 transaction, 1 propagation

## Strategy 1: Explicit Batching
Use `.batch()` when you control the code:

```javascript
_.batch(() => {
    _.data = newData;
    _.filter = newFilter;
    _.sort = newSort;
});
```

## Strategy 2: Auto-Batching
Enabled by default, happens automatically:

```javascript
// These 10 sets become 1 transaction
for (let i = 0; i < 10; i++) {
    _.items = someArray[i];
}
```

## Strategy 3: Configuration
```javascript
auto(obj, {
    auto_batch: true,        // Enable (default)
    auto_batch_delay: 0      // Next tick (default)
});
```

[complete guide...]
```

---

## Feature Set: Current vs Potential

### Current Feature Set (v049)

**Tier 1: Foundation** ✅ Mature, years of use
- Static & dynamic values
- Automatic dependency tracking
- Circular detection
- Subscriptions (watch/unwatch)
- Pure functions (no side effects)
- Error handling (#fatal handler)

**Tier 2: Advanced** ✅ Mature, well-tested
- Async functions with set()
- Nested dependencies
- Conditional dependencies
- Out-of-order execution
- Dynamic variable addition

**Tier 3: Infrastructure** ✅ Recent, well-tested
- Explicit batching (.batch())
- Auto-batching (timer-based)
- Change detection (hybrid)
- Transaction tracing
- Dependency guards (internal/external)

**Tier 4: Tooling** ✅ Prototype stage
- Record/playback system
- Regression testing

### Potential Enhancements

#### Short Term (Consolidation)

1. **Better Logging/Debugging**
   - Current: watch option, deep_log
   - Potential: Per-transaction logging, breakpoint support
   - Effort: Low (hooks exist)

2. **Performance Profiling**
   - Current: report_lag option
   - Potential: Per-phase timing, bottleneck detection
   - Effort: Medium (use 8-phase structure)
   - Tests: 044-48 already have timing tests

3. **Record/Playback Completion**
   - Current: Prototype exists
   - Potential: Full integration, compression, filtering
   - Effort: Medium (foundation ready)

#### Medium Term (New Features)

4. **Computed Caching**
   - Current: Auto-computed on every trigger
   - Potential: Explicit cache with invalidation strategy
   - Effort: Medium
   - Trade-off: Memory vs CPU

5. **Lazy Evaluation**
   - Current: All computed immediately
   - Potential: Compute only when accessed
   - Effort: High
   - Trade-off: Predictability vs Performance

6. **Time-Travel Debugging**
   - Current: Transaction traces saved
   - Potential: Replay specific transaction
   - Effort: Medium (traces have all info)
   - Foundation: Already have recording format

7. **Diff/Patch System**
   - Current: Change detection
   - Potential: Explicit diff objects, patch application
   - Effort: Low-Medium
   - Use case: Distributed updates

#### Long Term (Advanced Features)

8. **Distributed State Sync**
   - Current: Single machine
   - Potential: Sync across clients
   - Effort: High
   - Blocker: Need diff/patch first

9. **Middleware Pipeline**
   - Current: trace callback
   - Potential: tap into each phase
   - Effort: Medium
   - Foundation: Already have 8-phase structure

10. **Declarative Validation**
    - Current: Manual #fatal checks
    - Potential: Schema validation layer
    - Effort: Medium
    - Integration: Before/after propagate

11. **Observable Subscriptions** (RxJS-compatible)
    - Current: Simple callbacks
    - Potential: Full Observable protocol
    - Effort: High
    - Use case: React integration

---

## Organization Strategy Recommendation

### Phase 1: Quick Wins (1-2 weeks)
1. Create START_HERE.md (entry point)
2. Create FEATURE_MAP.md (feature → code mapping)
3. Create API_REFERENCE.md (quick lookup)
4. Create guides/ directory with 3-4 most common features

**Result**: Much better discoverability, no changes to existing structure

### Phase 2: Consolidation (1-2 months)
1. Review all 34 docs for duplication
2. Create cross-references
3. Update ARCHITECTURE.md with code examples
4. Add guides for record/playback, performance tuning

**Result**: Cleaner documentation landscape

### Phase 3: Enhancement (3-6 months)
1. Implement performance profiling hooks
2. Complete record/playback system
3. Create debugging guide
4. Add time-travel examples

**Result**: Better tooling for advanced users

---

## Specific Recommendations for Better Organization

### 1. Test Organization Enhancement

Current:
```
tests/files/001-066 (flat list)
```

Could add (without moving files):
```
tests/
├── files/ (unchanged - 66 files)
├── README.md
│   "Foundation: 001-015
│    Features: 016-043
│    Advanced: 044-048
│    Batching: 049-066"
└── test-map.md (feature to test number mapping)
```

### 2. Src File Organization

Current: Perfect (each version has clear purpose)

Recommendation: Document in FEATURE_MAP.md:
```
Feature          Versions    Size    Tests
Async Functions  026,39-40   ~25KB   031-32,41-42
Batching         044-47      ~80KB   049-59
Change Detection 048         ~32KB   060-65
```

### 3. Documentation Organization

Current: Scattered across multiple folders

Recommended structure:
```
docs/
├── START_HERE.md          ← Entry point
├── FEATURE_MAP.md         ← Feature index
├── API_REFERENCE.md       ← Quick lookup
├── ARCHITECTURE.md        ← Comprehensive (unchanged)
├── guides/
│   ├── async-functions.md
│   ├── batching.md
│   ├── change-detection.md
│   ├── record-playback.md
│   └── performance-tuning.md
├── devlog/ (unchanged)
├── discussion/ (unchanged)
└── [other dirs unchanged]
```

---

## Quick Implementation Checklist

### For START_HERE.md
- [ ] Explain what auto.js is (2 paragraphs)
- [ ] Show simple example
- [ ] List main features
- [ ] Link to relevant resources by use case
- [ ] Link to FEATURE_MAP for comprehensive index

### For FEATURE_MAP.md
- [ ] List each feature (15+ items)
- [ ] For each: Name, Version, Tests, Docs links
- [ ] Organize by complexity (foundation → advanced)
- [ ] Include search hints ("looking for async? See...")

### For API_REFERENCE.md
- [ ] auto(obj, options) - full signature
- [ ] All options documented
- [ ] All methods (.batch, .add_static, etc.)
- [ ] Special functions (#fatal, #trace)
- [ ] Examples for each

### For guides/ directory
- [ ] Each guide: Problem → Solution → Example
- [ ] Point to relevant source code
- [ ] Point to relevant tests
- [ ] Performance implications where relevant

---

## Success Criteria

A better organization would:

1. **Improve Discoverability**
   - New user asks "how do I do X?"
   - Can find answer in <30 seconds
   - Answer includes code, tests, docs

2. **Preserve Strengths**
   - devlog remains unchanged (source of truth)
   - Evolution narrative preserved
   - Test approach unchanged

3. **Enable Learning**
   - Foundation → Advanced progression clear
   - Concepts explained before features
   - Examples tied to actual tests

4. **Support Development**
   - Adding feature means:
     1. Add src/050_new_feature.js
     2. Add test/files/NNN_new_feature.js
     3. Add guides/new-feature.md
     4. Update FEATURE_MAP.md
   - Clear process, easy to follow

---

## Implementation Priority

**Must Have** (clarity essential):
1. START_HERE.md (5 commits)
2. FEATURE_MAP.md (2 commits)

**Should Have** (common questions):
3. API_REFERENCE.md (3 commits)
4. guides/async-functions.md (2 commits)
5. guides/batching.md (2 commits)

**Nice to Have** (polish):
6. guides/change-detection.md
7. guides/record-playback.md
8. guides/performance-tuning.md

---

*This analysis provides a path forward for better organization while preserving all existing strengths.*
