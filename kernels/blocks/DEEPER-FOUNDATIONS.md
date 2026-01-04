# Deeper Foundations: What Auto.js Really Is

**Date**: 2026-01-03
**Context**: After implementing the blocks kernel, exploring the fundamental nature of reactive state

---

## The Question

We say "auto.js is a directed graph of functions." But what does that **really** mean?

A graph is a static mathematical structure: nodes and edges. But auto.js has concepts like "stale," "execution," "change" - these are **dynamic** concepts. They're not part of the definition of a graph.

So what is auto.js actually modeling? What **is** the graph? What does "stale" mean at a fundamental level?

Let's think this through from first principles.

---

## Part 1: The Graph vs The State

### The Confusion

When we draw the dependency graph:

```
    [price]    [quantity]
       ↓           ↓
         [total]
           ↓
        [label]
```

We're showing **two different things** superimposed:

1. **The structure** (topology): which functions depend on which
2. **The state** (values): what each node currently equals

The graph itself - the nodes and edges - is **static**. It's defined at initialization and doesn't change.

But the **state flowing over the graph** is **dynamic**. Values change. Functions execute. "Stale" flags propagate.

### The Insight

**Auto.js is not just a graph. It's a graph + a state machine.**

- **Graph (static)**: Defines dependency structure
- **State (dynamic)**: Values at nodes, "stale" flags, execution history

The graph is the **skeleton**. The state is the **blood** flowing through it.

---

## Part 2: What "Stale" Really Means

### The Surface Explanation

"A function is stale if one of its dependencies changed."

But let's dig deeper. What does "changed" mean for a **pure** function?

### A pure function is determined by its inputs

Consider:
```javascript
const add = (x, y) => x + y;
```

This function with inputs `(2, 3)` is **fundamentally different** from the same function with inputs `(4, 5)`.

In fact, mathematically:
- `add(2, 3)` is just another way of writing `5`
- `add(4, 5)` is just another way of writing `9`

**A pure function + its inputs = a constant.**

### What "stale" actually means

When we say a function is "stale," we're saying:

> "We have a cached result for this function, but it was computed with **different inputs** than we have now. The cached result is **invalid** for the current inputs."

Staleness isn't a property of the function. It's a property of the **cache entry**.

**Stale = cache miss due to input change.**

### Staleness propagates like a wavefront

When `price` changes:

```
[price] ← Changes
   ↓ (stale propagates)
[total] ← Becomes stale
   ↓ (stale propagates)
[label] ← Becomes stale
```

This is like dropping a stone in water - ripples propagate outward following the edges.

**"Stale" is a property that flows through the graph structure.**

But it's not a property of the graph itself. It's a property of the **state** over the graph at this moment in time.

---

## Part 3: Function Executions as Immutable Facts

### The Realization

A pure function execution with specific inputs is an **immutable fact**:

```javascript
// This execution
add(2, 3) → 5

// Is a fact. It's always true. It never changes.
```

You could represent every execution as a tuple:

```javascript
Execution = {
    function: "add",           // Function definition (or hash)
    inputs: { x: 2, y: 3 },   // Input values
    output: 5,                 // Result
    timestamp: "2026-01-03",   // When it happened
    duration: 0.001            // How long it took
}
```

**This is a first-class entity.** It exists independently. You could store it in a database.

### Why this matters

If we think of executions as **facts**, we can:

1. **Cache them**: Hash the (function, inputs) → lookup cached output
2. **Store them**: Build a database of execution history
3. **Query them**: "How many times did `fetch_data` run today?"
4. **Compare them**: "Did this function return different results for the same inputs?" (non-determinism detection!)
5. **Profile them**: "Which functions are slowest? Which run most often?"
6. **Debug production**: "Why did this function execute 1000 times?"

**Treating executions as first-class entities enables observability.**

### The Cache Perspective

From this lens, auto.js is a **sophisticated caching system**:

```javascript
// Conceptual implementation
class FunctionCache {
    cache = new Map(); // (functionId, inputHash) → result

    get(functionId, inputs) {
        const key = hash(functionId, inputs);
        return this.cache.get(key);
    }

    set(functionId, inputs, result) {
        const key = hash(functionId, inputs);
        this.cache.set(key, result);
    }

    invalidate(functionId) {
        // Remove all cache entries for this function
        // (because one of its inputs changed)
    }
}
```

**The Resolver is a cache invalidation engine with dependency-aware propagation.**

---

## Part 4: What the Resolver Actually Does

Let's reframe the Resolver in terms of cache management:

### The Resolver's Job

```javascript
class Resolver {
    // Three responsibilities:

    // 1. Track cache validity
    stale = new Set();  // Functions with invalid cache entries

    // 2. Invalidate caches when inputs change
    markStale(name) {
        this.stale.add(name);
        // Propagate to all dependents (follow edges)
        for (let dependent of this.graph.getDescendants(name)) {
            this.stale.add(dependent);
        }
    }

    // 3. Recompute invalid caches in dependency order
    resolve() {
        // Get stale functions
        const toCompute = Array.from(this.stale);

        // Sort by dependencies (topological order)
        const order = this.graph.topologicalSort(toCompute);

        // Recompute each one
        for (let name of order) {
            const inputs = this.getDependencyValues(name);
            const result = this.execute(name, inputs);
            this.cache.set(name, inputs, result);
            this.stale.delete(name);
        }
    }
}
```

### Three Core Operations

1. **Invalidate**: Mark cache entries as stale
2. **Propagate**: Follow edges to invalidate dependent caches
3. **Recompute**: Execute functions in topological order

**This is memoization + dependency-aware cache invalidation.**

### Why Topological Order Matters

If we compute in the wrong order:

```javascript
// Wrong order: compute dependent before dependency
label = computeLabel();  // Uses stale 'total'
total = computeTotal();  // Now total is fresh, but label is wrong!
```

**Topological order ensures dependencies are fresh before dependents read them.**

---

## Part 5: The Core Insight

Let me state it clearly:

**Reactive state management is:**
1. **Memoization** (cache function results)
2. **+ Dependency tracking** (know what depends on what)
3. **+ Cache invalidation** (mark stale when inputs change)
4. **+ Topological execution** (recompute in the right order)

The graph provides **structure** (#2).
Pure functions provide **determinism** (#1).
Staleness provides **invalidation** (#3).
The resolver provides **order** (#4).

**That's it. That's the whole system.**

---

## Part 6: Functions as First-Class Entities (Blocks v2 Vision)

### The Current Architecture

Right now, we track:
- Function definitions (stored as JavaScript functions)
- Current values (stored in `this.values`)
- Stale flags (stored in `this.stale`)

But we **don't** track executions as entities. Each execution is ephemeral - it happens and disappears.

### What If We Tracked Executions?

```javascript
class ExecutionRecord {
    id: string;              // Unique ID
    functionId: string;      // Which function
    functionSource: string;  // Source code (for versioning)
    inputs: InputHash;       // Hash of dependency values
    output: any;            // Result
    startTime: number;      // When it started
    duration: number;       // How long it took
    isAsync: boolean;       // Was it async?
    promiseState: string;   // 'pending' | 'resolved' | 'rejected'
    version: string;        // Function version (git hash?)
}

class Resolver {
    executions: ExecutionRecord[] = [];  // Execution history

    execute(name) {
        const record = new ExecutionRecord();
        record.functionId = name;
        record.functionSource = this.functions[name].toString();
        record.inputs = this.hashInputs(name);
        record.startTime = Date.now();

        const result = this.functions[name]($);

        record.duration = Date.now() - record.startTime;
        record.output = result;

        this.executions.push(record);  // Store it!

        return result;
    }
}
```

### What This Enables

**1. Observability**

```javascript
// Query execution history
resolver.executions
    .filter(e => e.functionId === 'fetch_data')
    .length;  // "How many times did fetch_data run?"

resolver.executions
    .filter(e => e.duration > 1000)
    .map(e => e.functionId);  // "Which functions are slow?"
```

**2. Debugging**

```javascript
// Find non-deterministic functions
const nonDeterministic = resolver.executions
    .groupBy(e => [e.functionId, e.inputs])
    .filter(group => new Set(group.map(e => e.output)).size > 1);
// "These functions returned different outputs for the same inputs!"
```

**3. Performance Analysis**

```javascript
// Track call counts over time
const callCounts = resolver.executions
    .groupBy(e => e.functionId)
    .map(([id, execs]) => ({
        function: id,
        count: execs.length,
        avgDuration: execs.reduce((sum, e) => sum + e.duration, 0) / execs.length
    }));
```

**4. Production Debugging**

```javascript
// Store executions to database
resolver.on('execute', (record) => {
    database.insert('executions', record);
});

// Later, query production data
const productionIssue = database.query(`
    SELECT functionId, COUNT(*) as count
    FROM executions
    WHERE timestamp > '2026-01-03'
    GROUP BY functionId
    ORDER BY count DESC
`);
// "Ah, fetch_data ran 10000 times. That's the problem!"
```

**5. Code Version Tracking**

```javascript
// Compare behavior across versions
const v1Results = executions
    .filter(e => e.version === 'v1.0.0' && e.functionId === 'total')
    .map(e => e.output);

const v2Results = executions
    .filter(e => e.version === 'v2.0.0' && e.functionId === 'total')
    .map(e => e.output);

// "Did v2 change the results?"
```

### The Architecture

```javascript
// Blocks v2 structure

class FunctionEntity {
    id: string;
    name: string;
    source: string;        // Current source code
    dependencies: string[]; // From static analysis
    versions: Version[];    // History of source changes
}

class ExecutionEntity {
    id: string;
    function: FunctionEntity;
    inputs: InputHash;
    output: any;
    metadata: ExecutionMetadata;
}

class Resolver {
    functions: Map<string, FunctionEntity>;
    executions: ExecutionEntity[];
    cache: Map<CacheKey, ExecutionEntity>;  // Most recent execution

    execute(name: string): any {
        const fn = this.functions.get(name);
        const inputs = this.gatherInputs(fn);

        // Check cache
        const cacheKey = hash(fn, inputs);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey).output;
        }

        // Execute and record
        const execution = this.runAndRecord(fn, inputs);
        this.executions.push(execution);
        this.cache.set(cacheKey, execution);

        return execution.output;
    }
}
```

---

## Part 7: The Graph is a Computation Structure

### What the Graph Really Represents

The graph isn't modeling data flow or event flow. It's modeling **computation dependencies**.

Each edge means: "This computation needs that result as an input."

```javascript
// The edge price → total means:
// "Computing total requires the result of computing price"

total = (inputs) => inputs.price * inputs.quantity
//                      ↑
//                   needs this
```

**The graph is a recipe for how to assemble computations.**

### Static vs Dynamic

The graph structure is **static** (defined at initialization).
But the computation at each node is **dynamic** (depends on current input values).

Think of it like a circuit:
- Wires (edges) are static
- Electrical current (values) is dynamic
- Switches (stale flags) control flow

**The graph is the wiring diagram. Executions are the current flowing through it.**

### Why This Matters

Because the graph is static, we can:
- Analyze it statically (find circular dependencies before running anything)
- Visualize it (show the user the dependency structure)
- Optimize it (identify bottlenecks in the structure)
- Version it (track changes to the structure over time)

Because executions are dynamic, we can:
- Profile them (measure actual runtime behavior)
- Debug them (trace execution paths)
- Cache them (avoid redundant computation)
- Store them (build execution history)

**Structure is static. Behavior is dynamic. Both are valuable.**

---

## Part 8: Promises Complicate the Model

### The Async Problem

With synchronous functions:
```
inputs → function → output
```

This is instantaneous. The cache entry is complete immediately.

With async functions:
```
inputs → function → Promise<output>
```

Now there's a **temporal gap** between starting computation and having the result.

### Three States

An execution can be in three states:

1. **Not started**: Cache miss, need to compute
2. **Pending**: Computation started but not finished (Promise)
3. **Resolved**: Computation finished, result available

```javascript
class CacheEntry {
    state: 'not_started' | 'pending' | 'resolved';
    promise?: Promise<any>;
    result?: any;
}
```

### Why This Matters

Dependent functions must **wait** for pending computations:

```javascript
// If total is pending
cache.get('total').state === 'pending'

// Then label must wait
function computeLabel() {
    if (cache.get('total').state === 'pending') {
        return; // Skip execution, stay stale
    }
    // Otherwise proceed
}
```

**Async adds a temporal dimension to the cache invalidation problem.**

### The Promise-Aware Resolver

```javascript
class Resolver {
    execute(name) {
        // Check if dependencies are ready
        for (let dep of this.getDeps(name)) {
            const entry = this.cache.get(dep);
            if (entry.state === 'pending') {
                return; // Can't execute yet, dependency not ready
            }
        }

        // Execute
        const result = this.functions[name]($);

        // Handle Promise
        if (result instanceof Promise) {
            this.cache.set(name, { state: 'pending', promise: result });

            result.then(value => {
                this.cache.set(name, { state: 'resolved', result: value });
                this.markDependentsStale(name);  // Now dependents can run
            });
        } else {
            this.cache.set(name, { state: 'resolved', result });
        }
    }
}
```

**Promises require explicit state management in the cache.**

---

## Part 9: Putting It All Together

### The Complete Mental Model

1. **Pure functions + inputs = immutable facts**
   - Each execution is a constant
   - Can be hashed, cached, stored

2. **The graph is a computation structure**
   - Defines how computations depend on each other
   - Static (doesn't change at runtime)

3. **State flows over the graph**
   - Values at nodes (current results)
   - Stale flags (cache validity)
   - Execution records (history)

4. **The Resolver manages the cache**
   - Invalidates when inputs change
   - Propagates invalidation through edges
   - Recomputes in topological order
   - Handles async with state machine

5. **Executions can be first-class entities**
   - Store them for observability
   - Query them for debugging
   - Profile them for performance
   - Version them for tracking changes

### The Formula

```
Reactive State Management =
    Pure Functions
  + Dependency Graph (structure)
  + Memoization (caching)
  + Invalidation (staleness)
  + Topological Execution (order)
  + Async State Management (promises)
```

---

## Part 10: Blocks v2 - Functions as First-Class Entities

### The Vision

What if we designed the next iteration around **functions and executions as primary entities**?

### Core Entities

```javascript
// 1. Function Entity
class FunctionEntity {
    id: string;
    name: string;
    source: string;
    dependencies: string[];
    metadata: {
        averageDuration: number;
        executionCount: number;
        lastExecuted: timestamp;
        versions: SourceVersion[];
    };
}

// 2. Execution Entity
class ExecutionEntity {
    id: string;
    functionId: string;
    inputHash: string;
    output: any;
    duration: number;
    timestamp: timestamp;
    promiseState?: 'pending' | 'resolved' | 'rejected';
}

// 3. Cache Entity
class CacheEntry {
    functionId: string;
    inputHash: string;
    execution: ExecutionEntity;
    isStale: boolean;
}
```

### The Resolver Becomes a Coordinator

```javascript
class Resolver {
    functions: Registry<FunctionEntity>;
    executions: Store<ExecutionEntity>;
    cache: Cache<CacheEntry>;
    graph: DependencyGraph;

    // Main API
    get(name: string): any {
        const entry = this.cache.lookup(name);

        if (entry && !entry.isStale) {
            return entry.execution.output;  // Cache hit
        }

        // Cache miss - need to recompute
        return this.resolve(name);
    }

    set(name: string, value: any): void {
        this.cache.update(name, value);
        this.invalidateDescendants(name);
    }

    // Execution engine
    resolve(name: string): any {
        // Get dependency order
        const order = this.graph.topologicalSort([name, ...ancestors(name)]);

        // Execute each
        for (let fn of order) {
            if (this.cache.get(fn).isStale) {
                const execution = this.execute(fn);
                this.executions.store(execution);  // Record it!
                this.cache.update(fn, execution);
            }
        }

        return this.cache.get(name).execution.output;
    }

    // Execution with full recording
    execute(name: string): ExecutionEntity {
        const fn = this.functions.get(name);
        const inputs = this.gatherInputs(fn);
        const inputHash = hash(inputs);

        const execution = new ExecutionEntity({
            functionId: name,
            inputHash,
            timestamp: Date.now()
        });

        const start = performance.now();
        const result = fn.source(inputs);  // Execute
        const duration = performance.now() - start;

        execution.duration = duration;
        execution.output = result;

        // Update function metadata
        fn.metadata.executionCount++;
        fn.metadata.averageDuration =
            (fn.metadata.averageDuration * (fn.metadata.executionCount - 1) + duration)
            / fn.metadata.executionCount;

        return execution;
    }
}
```

### What This Enables

**1. Rich Query API**

```javascript
// Which functions ran in the last minute?
resolver.executions.query({
    timestamp: { $gt: Date.now() - 60000 }
}).map(e => e.functionId);

// Which functions are slowest on average?
resolver.functions.all()
    .sort((a, b) => b.metadata.averageDuration - a.metadata.averageDuration)
    .slice(0, 10);

// Did this function ever return different results for same inputs?
resolver.executions
    .groupBy(e => [e.functionId, e.inputHash])
    .filter(group => new Set(group.map(e => e.output)).size > 1);
```

**2. Production Monitoring**

```javascript
// Export executions to monitoring service
resolver.on('execute', (execution) => {
    monitoring.record({
        metric: 'function_execution',
        tags: { functionId: execution.functionId },
        value: execution.duration
    });
});

// Alert on anomalies
if (execution.duration > fn.metadata.averageDuration * 10) {
    alert(`Function ${fn.name} took 10x longer than usual!`);
}
```

**3. Time-Travel Debugging**

```javascript
// Store all executions
const db = new ExecutionDatabase();
resolver.on('execute', (e) => db.insert(e));

// Later, reconstruct state at any point in time
const stateAtTime = db.reconstructState(timestamp);

// "What was the value of 'total' at 3pm yesterday?"
```

**4. Function Version Tracking**

```javascript
// Track source code changes
class FunctionEntity {
    versions: {
        hash: string;
        source: string;
        timestamp: timestamp;
        deployedBy: string;
    }[];

    updateSource(newSource: string) {
        this.versions.push({
            hash: hash(newSource),
            source: newSource,
            timestamp: Date.now(),
            deployedBy: getCurrentUser()
        });
    }
}

// Compare behavior across versions
const resultsV1 = executions.filter(e =>
    e.functionId === 'total' &&
    e.functionVersionHash === 'v1hash'
);

const resultsV2 = executions.filter(e =>
    e.functionId === 'total' &&
    e.functionVersionHash === 'v2hash'
);
```

---

## Part 11: The Fundamental Insight

Let me state it as clearly as I can:

**Auto.js is a pure function memoization system with dependency-aware cache invalidation.**

The graph structure + pure functions give us:
- **Determinism**: Same inputs → same output
- **Cacheability**: Results can be stored
- **Invalidation rules**: When to clear cache (follow edges)
- **Execution order**: Dependencies before dependents (topological sort)

Everything else is implementation detail.

Staleness = cache invalidity.
Execution = cache miss + recomputation.
Propagation = cache invalidation following edges.
Resolver = cache manager with topological execution.

**That's the core. Everything builds from this.**

---

## Part 12: Why This Matters for Blocks v2

### The Current Blocks Kernel

The current implementation is clean but:
- Executions are ephemeral (not stored)
- No execution metadata (timing, counts, etc.)
- Limited observability
- Hard to debug production issues

### Blocks v2 Could Be

A reactive state management system where **executions are first-class**:

```javascript
// Core entities
FunctionEntity - The function definition + metadata
ExecutionEntity - A recorded execution instance
CacheEntry - Current cached result

// Core operations
execute() - Run function, record execution, update cache
invalidate() - Mark cache entries stale
propagate() - Follow edges to invalidate dependents
query() - Search execution history

// Rich API
resolver.functions.get('total').metadata.averageDuration
resolver.executions.filter(e => e.duration > 1000)
resolver.cache.get('total').isStale
```

### The Benefits

1. **Observability**: See what's happening in production
2. **Debugging**: Query execution history to find issues
3. **Performance**: Identify bottlenecks from real data
4. **Versioning**: Track function changes and their impact
5. **Testing**: Compare executions across versions
6. **Documentation**: Execution history is self-documenting

**Making executions first-class turns the black box into a glass box.**

---

## Conclusion: The Path Forward

We've achieved with Blocks v1:
- ✅ Clean architecture (5 modules)
- ✅ Simpler core (vs v0.54)
- ✅ Production validated
- ✅ Async handling fixed

But we could go further. Blocks v2 could be:
- **Observable**: Full execution tracking
- **Debuggable**: Query execution history
- **Analyzable**: Rich metadata and profiling
- **Versionable**: Track code changes and impact
- **Testable**: Compare behavior across versions

The foundation: **Treat executions as immutable facts, store them, query them.**

The insight: **Reactive state = memoization + invalidation + order.**

The vision: **A glass-box reactive system where everything is visible and queryable.**

This is the next evolution of auto.js.
