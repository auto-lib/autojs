## Blocks Kernel Test Suite

Comprehensive tests for the simplified 4-module architecture, organized by module with numbered test files.

## Test Structure

```
tests/
├── graph/              # Module 1: DirectedGraph (8 tests)
├── static-analysis/    # Module 2: Static Analysis (9 tests)
├── blocks/             # Module 3: Blocks (6 tests)
├── resolver/           # Module 4: Resolver (6 tests)
├── auto/               # Module 5: auto() integration (10 tests)
├── run-module-tests.js # Module test runner
├── run-auto-tests.js   # Auto integration test runner
└── run-all-tests.js    # Master test runner
```

## Running Tests

```bash
# Run all tests (recommended)
npm test

# Run module tests only (29 tests)
npm run test:modules

# Run auto() integration tests only (10 tests)
npm run test:auto
```

## Test Format

### Module Tests (graph, static-analysis, blocks, resolver)

Each test exports:
- `setup` - Function that receives module exports and returns test result
- `expected` - Expected output
- `validate` - Function to extract actual output from test result

Example:
```javascript
export default {
    setup: ({ analyzeFunction }) => {
        const fn = ($) => $.x + $.y;
        return analyzeFunction(fn, 'sum');
    },
    expected: {
        deps: ['x', 'y']
    },
    validate: (result, expected) => {
        return {
            deps: Array.from(result).sort()
        };
    }
};
```

### Auto Integration Tests

Use the original auto.js test format with `$._` internals:

```javascript
export default {
    obj: {
        x: 5,
        doubled: ($) => $.x * 2
    },
    fn: ($) => {
        // Optional test function
    },
    _: {
        fn: ['doubled'],                  // Computed variables
        deps: { doubled: { x: true } },   // Dependencies
        value: { x: 5, doubled: 10 },     // Values
        stale: []                         // Stale variables
    }
};
```

The test runner provides a `$._` compatibility adapter that maps our internals to the expected format.

## Test Coverage

### Module 1: DirectedGraph (8 tests)

Pure graph operations:
- Empty graph, single node, single edge
- Topological sort, diamond dependencies
- Cycle detection
- Reachable nodes, ancestors

### Module 2: Static Analysis (9 tests)

Dependency discovery via toString/regex:
- No dependencies, single/multiple dependencies
- Self-reference exclusion
- Bracket notation, destructuring
- Conditional dependencies
- Graph building from functions

### Module 3: Blocks (6 tests)

Block composition and wiring:
- Single block creation
- Blocks with inputs/outputs
- Wire creation, auto-wiring
- Cross-block graphs
- Cross-block edge detection

### Module 4: Resolver (6 tests)

Execution and stale tracking:
- Static values, single computed
- Chained dependencies
- Set marks dependents stale
- Resolve all stale values
- Topological execution order

### Module 5: auto() Integration (10 tests)

Core behavior tests adapted from main test suite:
- Empty object, values, functions (001-003)
- Dependent functions (004-005, 009)
- Value setting (006-008)
- Conditional dependencies (022)

**Test Selection**: These 10 tests represent the **Core Behavior** category from `/docs/status/TEST-CATEGORIES.md` - the essential tests all kernels must pass.

## Comparison to Main Test Suite

The main auto.js test suite has **75+ tests** categorized as:
- ✅ Core Behavior (~30) - Essential
- 🟡 Implementation (~15) - v0.54 internals
- 🟢 Performance (~20) - Batching, change detection
- 🟣 Debugging (~3) - Root cause, tracing
- 🟠 Experimental (~1) - Recording

**Current Coverage**:
- **10/30 Core Behavior tests** (33%)
- **0/15 Implementation tests** (can use adapter)
- **0/20 Performance tests** (optional for minimal kernel)
- **0/3 Debugging tests** (optional)
- **0/1 Experimental** (optional)

## Module Test Philosophy

**Direct Testing**: Each module is tested directly without going through the full auto() API. This:
- Validates modules work independently
- Makes tests faster and simpler
- Clearly shows what each module does
- Enables testing internals (graph structure, stale tracking, etc.)

**Simplified Format**: Unlike main tests which check `$._`, module tests use straightforward assertions:
```javascript
expected: { nodes: ['a', 'b'], edgeCount: 1 }
```

**One Test Per File**: Following auto.js convention:
- Numbered sequentially (001, 002, ...)
- Descriptive filenames
- Easy to add/remove tests
- Clear test progression from simple to complex

## Next Steps

### Expand Core Behavior Coverage

Add more tests from the Core Behavior category:

**Circular Dependencies** (010-014, 030, 074):
- Direct circular dependency
- Nested circles
- Conditional circles at boot/triggered
- Inner loop detection
- Circular reference protection

**Side Effects** (018, 028):
- Functions can't write state
- Only subscriptions have side effects

**Complex Patterns** (024-027):
- Out-of-order function definitions
- Nested function calls
- Arrays of reactive objects

**Async Support** (041-042):
- Async functions
- Async dependencies

### Performance Features

Add tests for:
- Auto-batching (051-059)
- Change detection / deep equality (060-065, 069-071)

### Full Compatibility

To match all 75+ tests, need:
- Performance features (batching, change detection)
- Debugging features (root cause, excessive calls)
- Implementation detail tests (with adapter)

## Test Results

**Current Status**: ✅ **39/39 tests passing** (100%)

```
Module Tests:      29 passing
- DirectedGraph:    8/8
- Static Analysis:  9/9
- Blocks:           6/6
- Resolver:         6/6

Auto Integration:  10/10 passing
```

## Writing New Tests

### Module Tests

1. Create numbered file in appropriate directory (e.g., `010_new_test.js`)
2. Export object with `setup`, `expected`, `validate`
3. Run `npm run test:modules` to verify

### Auto Integration Tests

1. Create numbered file in `auto/` directory
2. Export object with `obj`, `fn`, `_`
3. Run `npm run test:auto` to verify

The test runners automatically discover and run all `.js` files in test directories.
