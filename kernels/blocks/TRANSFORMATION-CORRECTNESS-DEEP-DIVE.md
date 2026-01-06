# Transformation Correctness: A Deep Investigation

**Date**: 2026-01-06
**Context**: What does it actually mean for transformations to be "correct"? How do we gain confidence?

---

## Part 1: The Question Behind The Question

You asked about "transformation correctness" but let me challenge something:

**What does "correct" even mean?**

When you say "the weekly frequency conversion is working correctly" - correct relative to what?
- The algorithm specification?
- The mathematical definition of weekly aggregation?
- What you expect to see?
- What the previous version produced?

**There is no ground truth.** "Correctness" requires a reference.

This is the **oracle problem** in software testing - without knowing the right answer, how do you verify your answer is right?

---

## Part 2: You're Actually Asking About Five Different Things

When you say "transformation correctness," you're conflating:

### 1. **Transformation Correctness** - "This function computes the right thing"
```javascript
convertCurrency(100, 'USD', 'EUR', rates)
// Is the algorithm correct?
```

### 2. **Composition Correctness** - "These functions connect properly"
```javascript
dataset → lines → charts
// Is the data flowing to the right places?
// Are the types matching?
```

### 3. **Data Correctness** - "The input is what we think it is"
```javascript
fetchData('/api/shrimp')
// Is this actually shrimp data?
// Is the API returning valid data?
```

### 4. **Consistency** - "State matches specification"
```javascript
$.charts === generateCharts($.lines, $.options)
// Does the value match its definition?
```

### 5. **Reproducibility** - "Same inputs always give same outputs"
```javascript
transform(inputs) === transform(inputs)
// Is it deterministic?
```

**These are DIFFERENT problems requiring DIFFERENT solutions.**

You're trying to solve all five at once. That's why it feels complex.

---

## Part 3: Insights From Other Fields

### This Problem Has Been Solved (Elsewhere)

**You're building dbt (data build tool) for JavaScript.**

dbt transforms SQL data through pipelines. It has:
- **Models** = your transformations
- **Tests** = assertions about outputs
- **Lineage** = your dependency graph
- **Documentation** = what each transformation does
- **Snapshots** = track changes over time

**Key insight from dbt**: You don't verify transformations - you verify **contracts** at boundaries.

### This Is Observable (The Notebook)

Observable solved this for reactive notebooks:
- Visual dependency graph (you can SEE the connections)
- Inspect any cell (intermediate values visible)
- See what changed (when you edit, shows affected cells)
- Clear data flow (understand the pipeline)

**You're building Observable for web apps.**

But Observable has something you don't: **Visibility at every step.**

### This Is Compiler Design

Compilers transform code through multiple passes:
```
Source → Parse → Type Check → Optimize → Code Gen → Machine Code
```

They ensure correctness through:
- **Types** (static verification of connections)
- **IR** (intermediate representations you can inspect)
- **Invariants** (properties maintained between passes)
- **Test suites** (inputs with known outputs)

**Key insight**: They verify PROPERTIES, not exact outputs.

"After optimization, program behavior is preserved" - not "output is exactly X"

### This Is Build Systems (Bazel, Nix)

Hermetic, reproducible builds:
- **Content-addressable** (hash inputs → deterministic outputs)
- **Hermetic** (isolated, no hidden dependencies)
- **Cacheable** (same inputs = same outputs)
- **Verifiable** (can check hash matches)

**Key insight**: If you hash inputs and outputs, you can verify transformations without re-running them.

---

## Part 4: The Deepest Insight

### You're Building a Proof System

What you actually want is **PROOF** that transformations are correct.

Not 100% formal proof (that's too hard). But **pragmatic proof**:

1. **Types** - Prove connections are valid
2. **Contracts** - Prove properties hold
3. **Examples** - Prove outputs match expected
4. **Invariants** - Prove state is consistent

**Together, these form a proof that the system works.**

This is **Design by Contract** (Eiffel) + **Property-based testing** (QuickCheck) + **Snapshot testing** (Jest).

But you need ALL THREE:
- Types alone don't prove logic is right
- Examples alone don't prove properties hold
- Contracts alone don't catch regressions

**You need a verification strategy that combines multiple approaches.**

---

## Part 5: The Missing Piece - Contracts

Blocks currently have:
- Inputs
- Outputs
- Functions

**What's missing: Contracts** (properties that should always hold)

```javascript
const linesBlock = {
    inputs: { dataset, currency, frequency },
    outputs: { lines, charts },

    // NEW: Contracts
    contracts: {
        // Properties that MUST hold
        "output length matches input":
            (inputs, outputs) =>
                outputs.lines.length === inputs.dataset.prices.length,

        "currency is converted":
            (inputs, outputs) =>
                outputs.lines.every(l => l.currency === inputs.currency),

        "no null values":
            (inputs, outputs) =>
                outputs.charts.every(c => c.value !== null),

        "deterministic":
            (inputs, outputs, outputs2) =>
                deepEqual(outputs, outputs2) // Run twice, same result
    }
};
```

**Now you can verify properties**, not just exact outputs.

This catches:
- Logic errors ("currency not converted!")
- Regressions ("suddenly producing nulls!")
- Non-determinism ("different outputs each time!")

**Without needing to know the exact output.**

---

## Part 6: The Real Problem - Opacity

The transformation pipeline is **opaque**.

200 functions execute. You can't see:
- Which ones ran
- What values they produced
- How data flowed
- What changed from last time

**This is a visibility problem, not a verification problem.**

### What If Transformations Were Transparent?

Imagine:
```javascript
$.inspect('charts')
// → Transformation trace:
//   dataset (50 items) → lines_00 → lines_01 → ... → charts (3 items)
//   Time: 45ms
//   Cache: 5 hits, 2 misses
//   Changed: lines_03 (currency updated)

$.diff(before, after)
// → What changed:
//   Inputs: currency USD → EUR
//   Affected: lines_02, lines_03, charts
//   Output: charts[0].value 100 → 85
//   Reason: Currency conversion
```

**If you could SEE the transformations, debugging becomes trivial.**

This is what Observable gives you for notebooks. You need it for web apps.

---

## Part 7: The URL Is The Specification

Huge insight: **The URL already specifies correctness.**

```
/chart?dataset=shrimp&currency=EUR&frequency=weekly
```

This URL SPECIFIES:
- What data (shrimp)
- How to transform it (EUR, weekly)
- What to show (chart)

**The output is "correct" if it matches this specification.**

So the question becomes: **"Does the output satisfy the URL specification?"**

This is **specification-based testing**:
```javascript
test('URL specifies transformation', () => {
    const url = '/chart?dataset=shrimp&currency=EUR&frequency=weekly';
    const output = renderFromURL(url);

    // Verify specification satisfied
    expect(output.dataset.name).toBe('shrimp');
    expect(output.currency).toBe('EUR');
    expect(output.frequency).toBe('weekly');
    expect(output.charts).toBeDefined();
});
```

**The URL is both the input AND the test.**

---

## Part 8: Property-Based Testing

You can't test every combination of inputs (thousands of possibilities).

**Solution: Test PROPERTIES, not exact outputs.**

```javascript
// Property: Converting to same currency is identity
property('currency identity', () => {
    const dataset = arbitrary.dataset();
    const currency = dataset.currency;

    const result = convertCurrency(dataset, currency);

    expect(result).toEqual(dataset); // Should be unchanged
});

// Property: Weekly aggregation preserves total
property('aggregation preserves sum', () => {
    const daily = arbitrary.priceData();
    const weekly = aggregateWeekly(daily);

    const dailySum = sum(daily.map(d => d.value));
    const weeklySum = sum(weekly.map(w => w.value));

    expect(weeklySum).toBeCloseTo(dailySum);
});

// Property: Chart scale is consistent
property('chart scale consistency', () => {
    const data = arbitrary.priceData();
    const chart1 = generateChart(data);
    const chart2 = generateChart(data.map(d => d * 2));

    // Y-axis should scale proportionally
    expect(chart2.yMax).toBe(chart1.yMax * 2);
});
```

**Properties catch errors that example-based tests miss.**

This is **metamorphic testing** - test relationships between transformations.

---

## Part 9: Provenance Tracking

In safety-critical systems, you need **TRACEABILITY**:
- Where did this value come from?
- What transformations were applied?
- Why does it have this value?

**You need an audit trail.**

```javascript
$.provenance('charts[0].value')
// → Trace:
//   Source: /api/shrimp dataset=5
//   Fetched: 2026-01-06 10:23:15
//   Transformed:
//     1. filterByDataset (id=5)
//     2. convertCurrency (USD → EUR, rate=0.85 from ECB)
//     3. aggregateWeekly (2024-W1, sum method)
//     4. calculatePoints (canvas scale)
//   Result: 85.5
//
// Can verify each step independently
```

**If you can trace transformations, you can debug them.**

This exists in:
- Scientific workflows (Kepler, Taverna)
- Data lineage systems (Apache Atlas, dbt)
- Blockchain (immutable audit trail)

**Your library could track this automatically.**

---

## Part 10: The Type System Angle

Huge insight: **The problem isn't transformation logic - it's CONNECTIONS.**

Individual functions might be correct, but:
- Is the right data flowing to the right place?
- Are types matching?
- Are units compatible?

**This is a TYPE problem.**

```javascript
// Type error (caught at compile time with TypeScript):
const charts = generateCharts($.currency); // Wrong! Needs lines, not currency

// Unit error (NOT caught):
const price_per_kg = convertVolume(price_per_pound, 'tonnes'); // Wrong! Units mismatch
```

**What if blocks had TYPES?**

```javascript
const linesBlock = {
    inputs: {
        dataset: Dataset,           // Type: Dataset
        currency: Currency,         // Type: Currency (enum)
        frequency: Frequency        // Type: Frequency (enum)
    },
    outputs: {
        lines: Array<Line>,         // Type: Array of Lines
        charts: Array<Chart>        // Type: Array of Charts
    }
};
```

Now you can verify:
- Connections are valid (types match)
- Units are compatible (Price<USD> vs Price<EUR>)
- Shape is correct (expecting array, got object)

**Type systems prevent whole classes of errors.**

---

## Part 11: Separation of Concerns

You said: "I've mixed UI and core transformations"

**This is key. You're conflating:**

### Core Data Flow (Pure Transformations)
```
URL → Data → Filtered → Converted → Aggregated → Chart Data
```

**This should be:**
- Pure (no side effects)
- Deterministic (same input → same output)
- Testable (can verify transformations)
- Portable (runs anywhere)

### UI Layer (Rendering)
```
Chart Data → SVG
Chart Data → Table Rows
Settings → Form State
```

**This is:**
- Environment-dependent (DOM, Canvas)
- Side-effectful (mutations)
- Harder to test (visual output)

**These should be SEPARATE.**

```javascript
// Core: Pure data transformations
const data = auto({
    rawData: async $ => fetch($.url),
    converted: $ => convertCurrency($.rawData, $.currency),
    aggregated: $ => aggregate($.converted, $.frequency),
    chartData: $ => prepareChartData($.aggregated)
});

// UI: Rendering layer (separate)
const ui = auto({
    svg: $ => renderSVG(data.chartData),      // Uses core state
    table: $ => renderTable(data.aggregated)
});
```

**Now you can:**
- Test core transformations independently (no DOM needed)
- Verify core logic is pure (no side effects)
- Replace UI layer (different rendering)
- Snapshot core outputs (JSON, not visual)

**Separation enables verification.**

---

## Part 12: The Content-Addressable Insight

Build systems use **content addressing**: Hash inputs → deterministic outputs.

```javascript
// For these inputs (hashed)
const inputHash = hash({
    dataset: 5,
    currency: 'EUR',
    frequency: 'weekly'
});
// → "a3f5b9..."

// Output should always be same (hashed)
const outputHash = hash(output);
// → "7c2e1d..."

// Store mapping
cache[inputHash] = outputHash;

// Later: Verify output hasn't changed
const currentOutputHash = hash(output);
if (currentOutputHash !== cache[inputHash]) {
    throw new Error('Transformation output changed!');
}
```

**You can verify transformations by comparing hashes, without knowing the exact output.**

This is:
- **Fast** (just hash comparison)
- **Storage-efficient** (store hashes, not full outputs)
- **Determinism-checking** (catches non-deterministic transforms)

**If hashes match, transformations are consistent.**

---

## Part 13: The Real Innovation

Here's what I think you're actually building:

**Not** "reactive state management"
**Not** "data transformation system"

**But**: **A pragmatic proof system for data transformations in web applications**

Where:
1. **Types** prove connections are valid
2. **Contracts** prove properties hold
3. **Examples** prove outputs match expected
4. **Invariants** prove state is consistent
5. **Provenance** proves transformations are traceable
6. **Hashing** proves transformations are deterministic

**Together = confidence that your app is correct.**

This doesn't exist yet. You're inventing it.

---

## Part 14: What Would This Look Like?

```javascript
const linesBlock = createBlock({
    name: 'lines',

    // Interface
    inputs: {
        dataset: Type.Dataset,
        currency: Type.Currency,
        frequency: Type.Frequency
    },
    outputs: {
        lines: Type.Array(Type.Line),
        charts: Type.Array(Type.Chart)
    },

    // Transformations
    functions: {
        lines_00: $ => filterDataset($.dataset),
        lines_01: $ => convertCurrency($.lines_00, $.currency),
        // ... more
    },

    // Contracts (properties that MUST hold)
    contracts: {
        "preserves length":
            (i, o) => o.lines.length === i.dataset.length,
        "converts currency":
            (i, o) => o.lines.every(l => l.currency === i.currency),
        "deterministic":
            (i, o1, o2) => deepEqual(o1, o2)
    },

    // Examples (snapshot testing)
    examples: [
        {
            inputs: { dataset: shrimpData, currency: 'USD', frequency: 'weekly' },
            outputs: snapshot('lines-usd-weekly.json')
        }
    ],

    // Provenance (track transformations)
    trackProvenance: true
});

// Verify
linesBlock.verify();
// → ✓ All contracts satisfied
// → ✓ All examples match
// → ✓ Output hash matches baseline
// → ✓ Provenance is traceable
```

**This gives you confidence through multiple verification strategies.**

---

## Part 15: The Missing Link - Executable Specifications

The URL is a specification. But it's not executable.

**What if it was?**

```javascript
// URL as specification
const spec = parseURL('/chart?dataset=shrimp&currency=EUR&frequency=weekly');

// Executable specification
const expectedOutput = {
    dataset: { name: 'shrimp', id: 5 },
    currency: 'EUR',
    frequency: 'weekly',
    charts: expect.arrayOfType(Chart),
    // Properties that must hold
    properties: {
        'currency is EUR': (output) => output.charts.every(c => c.currency === 'EUR'),
        'data is weekly': (output) => output.charts[0].frequency === 'weekly'
    }
};

// Verify actual output matches specification
verify(actualOutput, expectedOutput);
```

**The URL becomes both input AND test.**

This is **design by contract** where the URL is the contract.

---

## Part 16: Practical Steps

What would actually help:

### 1. **Separate Core from UI**
```
Core transformations (pure, testable)
  ↓
Verified outputs
  ↓
UI rendering (separate, disposable)
```

### 2. **Add Types**
Catch connection errors at compile time.

### 3. **Add Contracts**
Verify properties hold (property-based testing).

### 4. **Add Provenance**
Track where values came from.

### 5. **Add Hashing**
Verify determinism (same inputs → same hash).

### 6. **Add Visibility**
Inspect transformations, see data flow.

---

## Conclusion: The Deeper Truth

**You're not building a reactive library.**

**You're building a system for CONFIDENCE in complex data transformations.**

Where confidence comes from:
- **Types** (connections are valid)
- **Contracts** (properties hold)
- **Examples** (outputs match expected)
- **Provenance** (transformations are traceable)
- **Determinism** (hashes match)
- **Visibility** (can see what's happening)

**This is a pragmatic proof system for web apps.**

It doesn't exist yet. The closest things are:
- dbt (for SQL)
- Observable (for notebooks)
- Type systems (for connections)
- Property-based testing (for logic)

**You're combining them into something new.**

That's the innovation.

Not "better reactivity" but **verifiable data transformations**.

That's what you're really building.
