# Visual Guide: Graph-First Architecture

This document provides visual diagrams to understand how the graph-first architecture works.

## The Three Layers

```
USER CODE
    │
    │  let $ = auto({ ... })
    │  $.data = [1,2,3]
    │  console.log($.msg)
    │
    ▼
┌─────────────────────────────────┐
│  LAYER 1: Auto API (Proxy)      │
│                                 │
│  $. ──► get/set traps           │
│  $._ ──► introspection          │
│  $.visualize() ──► toDot()      │
└─────────────────────────────────┘
    │
    │  get(name) / set(name, val)
    │
    ▼
┌─────────────────────────────────┐
│  LAYER 2: GraphState (Mutable)  │
│                                 │
│  values: Map { data → [1,2,3] } │
│  dirty: Set { count, msg }      │
│                                 │
│  get() ──► compute if dirty     │
│  set() ──► mark dependents      │
└─────────────────────────────────┘
    │
    │  Query graph structure
    │
    ▼
┌─────────────────────────────────┐
│  LAYER 3: ReactiveGraph         │
│            (Immutable)          │
│                                 │
│  nodes: { data, count, msg }    │
│  edges: { count→[data] }        │
│  reverseEdges: { data→[count] } │
│  executionOrder: [count, msg]   │
└─────────────────────────────────┘
```

## Graph Structure Example

Given this definition:

```javascript
auto({
    data: null,
    count: ($) => $.data?.length ?? 0,
    msg: ($) => `Got ${$.count} items`,
    doubled: ($) => $.count * 2
})
```

### Node Types

```
STATIC NODES (blue)         COMPUTED NODES (green)
┌──────────┐                ┌──────────┐
│   data   │                │  count   │
└──────────┘                └──────────┘
                            ┌──────────┐
                            │   msg    │
                            └──────────┘
                            ┌──────────┐
                            │ doubled  │
                            └──────────┘
```

### Dependency Graph (edges)

```
         data (static)
          │
          │ (count depends on data)
          │
          ▼
        count (computed)
          │
          ├──────────┬─────────┐
          │          │         │
          ▼          ▼         ▼
        msg      doubled    (other nodes)
    (computed)  (computed)
```

### Graph Structure in Memory

```javascript
nodes: Map {
  'data'    → { name: 'data',    type: 'static',   fn: null }
  'count'   → { name: 'count',   type: 'computed', fn: [Function] }
  'msg'     → { name: 'msg',     type: 'computed', fn: [Function] }
  'doubled' → { name: 'doubled', type: 'computed', fn: [Function] }
}

edges: Map {  // Forward: What does X depend on?
  'count'   → Set ['data']
  'msg'     → Set ['count']
  'doubled' → Set ['count']
}

reverseEdges: Map {  // Reverse: Who depends on X?
  'data'  → Set ['count']
  'count' → Set ['msg', 'doubled']
}

executionOrder: ['count', 'msg', 'doubled']
  (or ['count', 'doubled', 'msg'] - both valid)
```

## Initialization Flow

```
┌──────────────────────────────────────────────────────────┐
│ 1. auto({ data: null, count: ($)=> $.data.length, ... }) │
└──────────────────────────────────────────────────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │  new ReactiveGraph()    │
         └─────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
  ┌──────────┐              ┌──────────────┐
  │  _build  │              │  Initialize  │
  │          │              │    nodes     │
  │  First   │              │              │
  │  Pass    │              │  data: {...} │
  └──────────┘              │  count:{...} │
        │                   └──────────────┘
        │
        ▼
  ┌───────────────────────┐
  │  _discoverDependencies │
  │                       │
  │  Run each function    │
  │  with tracking proxy  │
  │                       │
  │  count: ($)=> $.data  │
  │    ↓                  │
  │  Proxy sees 'data'    │
  │  accessed             │
  └───────────────────────┘
        │
        ▼
  ┌──────────┐
  │  Build   │
  │  edges   │
  │          │
  │  count   │
  │    ↓     │
  │  [data]  │
  └──────────┘
        │
        ▼
  ┌──────────┐
  │ Validate │
  │          │
  │ Check    │
  │ cycles   │
  └──────────┘
        │
        ▼
  ┌────────────────────┐
  │ Topological sort   │
  │                    │
  │ executionOrder =   │
  │ [count, msg, ...]  │
  └────────────────────┘
        │
        ▼
┌───────────────────┐
│ new GraphState()  │
│                   │
│ values: {         │
│   data: null      │
│ }                 │
│ dirty: Set {}     │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Create Proxy      │
│                   │
│ return $          │
└───────────────────┘
```

## Access Flow: First Read

What happens when you access `$.count` for the first time?

```
USER: $.count
  │
  ▼
┌─────────────────────────┐
│ Proxy get trap          │
│ get(target, 'count')    │
└─────────────────────────┘
  │
  ▼
┌──────────────────────────┐
│ GraphState.get('count')  │
│                          │
│ Check: computed? YES     │
│ Check: has value? NO     │
│        dirty? NO         │
│                          │
│ → Need to compute!       │
└──────────────────────────┘
  │
  ▼
┌────────────────────────────┐
│ GraphState._compute()      │
│                            │
│ 1. Create proxy for fn     │
│ 2. Run: ($)=>$.data.length │
│ 3. Proxy intercepts $.data │
│    → calls get('data')     │
│    → returns null          │
│ 4. null?.length → 0        │
│ 5. Set value: count = 0    │
└────────────────────────────┘
  │
  ▼
┌───────────────┐
│ Return: 0     │
└───────────────┘
```

### State After First Access

```
values: Map {
  'data'  → null
  'count' → 0      ← Computed and cached
}

dirty: Set {}
```

## Update Flow: Setting a Value

What happens when you do `$.data = [1, 2, 3]`?

```
USER: $.data = [1,2,3]
  │
  ▼
┌──────────────────────────────┐
│ Proxy set trap               │
│ set(target, 'data', [1,2,3]) │
└──────────────────────────────┘
  │
  ▼
┌────────────────────────────────────┐
│ GraphState.set('data', [1,2,3])    │
│                                    │
│ 1. Check: computed? NO (static)    │
│ 2. Check: changed? YES             │
│ 3. Update: values['data']=[1,2,3]  │
│ 4. Find affected nodes             │
└────────────────────────────────────┘
  │
  ▼
┌────────────────────────────────────┐
│ graph.getAffectedNodes(['data'])   │
│                                    │
│ Start queue: ['data']              │
│ Process 'data':                    │
│   reverseEdges['data'] = ['count'] │
│   Add 'count' to affected          │
│   Add 'count' to queue             │
│                                    │
│ Process 'count':                   │
│   reverseEdges['count'] =          │
│     ['msg', 'doubled']             │
│   Add both to affected             │
│                                    │
│ Result: Set {                      │
│   'count', 'msg', 'doubled'        │
│ }                                  │
└────────────────────────────────────┘
  │
  ▼
┌──────────────────────────┐
│ Mark all as dirty        │
│                          │
│ dirty.add('count')       │
│ dirty.add('msg')         │
│ dirty.add('doubled')     │
└──────────────────────────┘
  │
  ▼
┌───────────────────┐
│ DONE (lazy)       │
│                   │
│ Values not        │
│ recomputed yet!   │
└───────────────────┘
```

### State After Set

```
values: Map {
  'data'    → [1, 2, 3]  ← Updated
  'count'   → 0          ← STALE!
  'msg'     → 'Got 0 items'  ← STALE!
  'doubled' → 0          ← STALE!
}

dirty: Set {
  'count', 'msg', 'doubled'  ← Marked for recomputation
}
```

## Update Flow: Reading After Change

What happens when you access `$.msg` after the change?

```
USER: $.msg
  │
  ▼
┌────────────────────────┐
│ Proxy get trap         │
│ get(target, 'msg')     │
└────────────────────────┘
  │
  ▼
┌─────────────────────────┐
│ GraphState.get('msg')   │
│                         │
│ Check: computed? YES    │
│ Check: dirty? YES       │
│                         │
│ → Need to recompute!    │
└─────────────────────────┘
  │
  ▼
┌──────────────────────────────────────┐
│ GraphState._compute('msg')           │
│                                      │
│ 1. Run: ($)=>`Got ${$.count} items`  │
│ 2. Access $.count                    │
│    → Proxy intercepts                │
└──────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────┐
│ NESTED: get('count')        │
│                             │
│ Check: dirty? YES           │
│ → Need to compute count!    │
└─────────────────────────────┘
  │
  ▼
┌──────────────────────────────────┐
│ NESTED: _compute('count')        │
│                                  │
│ 1. Run: ($)=>$.data?.length ?? 0 │
│ 2. Access $.data                 │
│    → get('data') → [1,2,3]       │
│ 3. [1,2,3].length → 3            │
│ 4. Set: count = 3                │
│ 5. Remove 'count' from dirty     │
└──────────────────────────────────┘
  │
  ▼
┌─────────────────────┐
│ Return 3 to msg fn  │
└─────────────────────┘
  │
  ▼
┌────────────────────────────┐
│ Continue _compute('msg')   │
│                            │
│ 3. $.count = 3             │
│ 4. Result: "Got 3 items"   │
│ 5. Set: msg = "Got 3 items"│
│ 6. Remove 'msg' from dirty │
└────────────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Return "Got 3 items" │
└──────────────────────┘
```

### State After Access

```
values: Map {
  'data'    → [1, 2, 3]
  'count'   → 3              ← Recomputed
  'msg'     → 'Got 3 items'  ← Recomputed
  'doubled' → 0              ← Still dirty!
}

dirty: Set {
  'doubled'  ← Only unaccessed nodes remain dirty
}
```

## Comparison: Current vs Graph-First

### Current Auto.js: Implicit Graph

```
SET $.data = [1,2,3]
  │
  ▼
┌───────────────────────────────────┐
│ propagate()                       │
│                                   │
│ Phase 1: Invalidate               │
│   Walk dependents object          │
│   deps['data'] → find 'count'     │
│   deps['count'] → find 'msg'      │
│   Build affected: {count, msg}    │
│                                   │
│ Phase 2: Topological Sort         │
│   DFS to order: [count, msg]      │
│                                   │
│ Phase 3: Capture old values       │
│   old = {count:0, msg:'Got 0...'}│
│                                   │
│ Phase 4: Clear values             │
│   delete value['count']           │
│   delete value['msg']             │
│                                   │
│ Phase 5: Recompute                │
│   Trigger get for count → runs fn │
│   Trigger get for msg → runs fn   │
│                                   │
│ Phase 6: Detect changes           │
│   Compare old vs new              │
│                                   │
│ Phase 7: Build trace              │
│   Create metadata                 │
│                                   │
│ Phase 8: Notify subscriptions     │
│   Call callbacks                  │
└───────────────────────────────────┘
```

**Graph is rediscovered each time!**

### Graph-First: Explicit Graph

```
SET $.data = [1,2,3]
  │
  ▼
┌──────────────────────────────────┐
│ GraphState.set()                 │
│                                  │
│ 1. Update value                  │
│ 2. Look up pre-computed edges:   │
│    graph.reverseEdges['data']    │
│    → Set {count}                 │
│ 3. Mark dirty: {count, msg}      │
└──────────────────────────────────┘

DONE (lazy)
```

**Graph is queried, not rebuilt!**

## Dynamic Dependencies: The Problem

```javascript
auto({
    mode: 'simple',
    data: [1,2,3],
    result: ($) => {
        if ($.mode === 'simple') {
            return $.data.length;     // Depends on: data
        } else {
            return $.data.join(',');  // Also depends on: data
        }
    }
})
```

### Discovery Phase (mode undefined)

```
Run: ($) => {
  if ($.mode === 'simple') { ... }
}

Proxy tracking:
  ✓ Access $.mode → recorded
  ✓ Access $.data → recorded
  ✓ Access $.data.length → undefined.length (error, caught)

Discovered deps: Set ['mode', 'data']
```

**Both branches explored!** (Due to error catching)

### Different Example: Early Return

```javascript
result: ($) => {
    if (!$.enabled) return 'N/A';
    return $.data.process($.config);
}
```

### Discovery (enabled undefined = falsy)

```
if (!$.enabled) return 'N/A';
  │
  │ (undefined is falsy, so return)
  │
  ▼
return 'N/A'

Discovered deps: Set ['enabled']
MISSING: data, config!
```

### The Fix: Static Analysis

```javascript
_discoverDependencies(fn) {
    // Parse source instead of running
    const source = fn.toString();
    const regex = /\$\.(\w+)/g;

    const deps = new Set();
    let match;
    while ((match = regex.exec(source)) !== null) {
        deps.add(match[1]);
    }
    return deps;
}
```

```
Source: "($) => { if (!$.enabled) return 'N/A'; return $.data.process($.config); }"

Regex matches: $.enabled, $.data, $.config

Discovered deps: Set ['enabled', 'data', 'config']
```

**All dependencies found!** (Conservative but correct)

## Summary Diagrams

### Data Flow

```
Static Values ──set──► GraphState.values
                            │
                            │ marks dirty
                            ▼
                       GraphState.dirty ──────┐
                                               │
                                               │ when accessed
                                               ▼
Computed Values ◄──compute── GraphState._compute()
                                               │
                                               │ queries structure
                                               ▼
                                     ReactiveGraph.edges
                                     ReactiveGraph.order
```

### Dependency Resolution

```
User sets $.data
        │
        ▼
  Who depends on 'data'?
        │
        │ Query pre-built graph
        ▼
  graph.reverseEdges.get('data')
        │
        ▼
    Set ['count']
        │
        ▼
  Who depends on 'count'?
        │
        ▼
  graph.reverseEdges.get('count')
        │
        ▼
    Set ['msg', 'doubled']
        │
        ▼
  Mark all dirty: {count, msg, doubled}
```

### Complete System

```
     USER
       │
       │ $.data = [1,2,3]
       │ $.msg
       │
       ▼
   ┌────────┐
   │ Proxy  │ ─────► Intercepts get/set
   └────────┘
       │
       ▼
   ┌────────────┐
   │ GraphState │ ─────► Manages values & dirty
   └────────────┘
       │
       │ queries
       ▼
   ┌──────────────┐
   │ ReactiveGraph│ ─────► Provides structure
   └──────────────┘

   Built once ───────► Graph (immutable)
   Flows through ───► Values (mutable)
```

## Key Takeaways

1. **Graph is built once** - structure doesn't change
2. **Values flow through** - only data changes
3. **Lazy evaluation** - compute only when needed
4. **Pre-computed traversal** - no rediscovery
5. **Clean separation** - structure vs state

The graph IS the program. Values are just data flowing through it.
