# Data Transformation & Correctness

**Date**: 2026-01-04
**Context**: What this library actually is - a system for verifiable data transformations

---

## The Realization

You said: **"What's really going on is simply data transformation"**

**This is it. This is the essence.**

Not "reactive state management" - that's just the mechanism.

Not "automatic updates" - that's just the implementation.

**It's about data transformation. With correctness guarantees.**

---

## Part 1: What It Actually Is

### The Core Reality

```javascript
const $ = auto({
    url: '/api/shrimp',
    currency: 'USD',
    frequency: 'monthly',

    data: async $ => fetch($.url),
    dataset: $ => $.data.find(d => d.id === 5),
    lines: $ => processLines($.dataset, $.currency, $.frequency),
    charts: $ => generateCharts($.lines),
    svg: $ => renderChart($.charts)
});
```

**What is this?**

It's a **data transformation pipeline**:
```
url, currency, frequency  →  data  →  dataset  →  lines  →  charts  →  svg
```

**Each step is a pure transformation**:
- Input: Some values
- Output: Transformed value
- **No side effects** (except fetch, which is getting data)

### Not Math, Not Execution - Data

You're right - examples like `a → b → c` make it look like math.

**But in reality**:
```
Raw JSON → Parsed Dataset → Filtered Lines → Chart Data → SVG String
```

**This is data flowing through transformations.**

Each function is a **data transformer**:
```javascript
transformer: InputData → OutputData
```

---

## Part 2: The Goal Is Correctness

### What You Actually Care About

**Question**: "For this URL with these settings, is the chart correct?"

Expanded:
```
Given:
  - URL: '/api/shrimp'
  - Currency: 'EUR'
  - Frequency: 'monthly'
  - Dataset: 5

Is the SVG chart showing the correct data?
```

**This is a correctness question.**

### The Transformation Chain

```
URL + settings → raw data → filtered → converted → aggregated → rendered
```

**Correctness means**: Each transformation is correct, so the final output is correct.

**If one transformation breaks**, the output is wrong.

### The Challenge

**With 200+ transformations**, how do you verify correctness?

You can't test every combination manually. There are thousands of possible inputs.

**You need the system to help you verify correctness.**

---

## Part 3: Transformations vs Functions

### Why "Function" Is Misleading

Functions can do anything:
```javascript
function doStuff(x) {
    console.log("Starting");      // Side effect
    callAPI();                     // Side effect
    updateGlobalState();           // Side effect
    return x + 1;                  // Transformation
}
```

**But in auto.js**, functions are **pure transformers**:
```javascript
const $ = auto({
    result: $ => {
        // ONLY allowed to:
        // 1. Read inputs ($.x)
        // 2. Transform data
        // 3. Return output
        //
        // NOT allowed to:
        // - Modify state (would fail)
        // - Call APIs (except in designated async functions)
        // - Produce side effects
        return $.x + 1;
    }
});
```

**They're not "functions" - they're "transformations".**

### The Vocabulary

Instead of:
- "Function executes" → "Transformation applies"
- "Function returns value" → "Transformation produces output"
- "Function depends on inputs" → "Transformation consumes inputs"

**This changes how you think about it.**

---

## Part 4: The Transformation Graph

### It's a DAG of Transformations

```
    url ──────┐
              ├──→ data ──→ dataset ──┐
 currency ────┼──────────────────────┼──→ lines ──→ charts ──→ svg
frequency ────┘                       │
dataset_id ───────────────────────────┘
```

**Each node is a transformation.**
**Each edge is data flow.**

### Transformations Are Pure

**Mathematical property**:
```
transform(input) = output
```

**Always.** Same input → same output.

**This means**:
- Transformations are **deterministic**
- Transformations are **reproducible**
- Transformations are **verifiable**

**If `lines(dataset, currency, frequency)` produces X today, it should produce X tomorrow.**

If it doesn't - something broke.

---

## Part 5: Correctness as Invariant

### The Invariant

**"All outputs match their transformations for current inputs"**

More precisely:
```
∀ node in graph:
  node.value = node.transform(inputs)
```

**This is the invariant the resolver maintains.**

When input changes:
```
Before: lines.value = transform(dataset₁, currency₁, frequency₁)
User changes currency to currency₂
After:  lines.value = transform(dataset₁, currency₂, frequency₁)
```

**The resolver re-applies transformations to restore the invariant.**

### Correctness = Invariant Holds

**If the invariant holds**, all values are correct (match their transformations).

**If the invariant breaks**, something is wrong.

**The library's job**: Maintain this invariant automatically.

---

## Part 6: Why Blocks Matter for Correctness

### Blocks as Verification Units

You said: "Split into blocks so we can confirm a URL produces the same values"

**Exactly. Blocks are transformation units with testable boundaries.**

```javascript
const linesBlock = {
    inputs: { dataset, currency, frequency },
    outputs: { lines, charts, mainpoints },
    transformations: [lines_00, lines_01, ..., lines_07]
};
```

**This lets you verify**:
```javascript
// Test: Does this transformation produce expected output?
const result = linesBlock.transform({
    dataset: testDataset,
    currency: 'USD',
    frequency: 'monthly'
});

expect(result.charts).toMatchSnapshot();
```

**Now you can:**
1. **Capture expected outputs** - "For these inputs, output should be X"
2. **Verify consistency** - "Does the transformation still produce X?"
3. **Detect breaks** - "Output changed - which transformation broke?"

### Blocks as Correctness Boundaries

**Block boundary = verification point**:
```
URL ──→ Data Block ──→ Lines Block ──→ Chart Block ──→ SVG
        ↓               ↓                ↓
      Verify          Verify           Verify
```

At each boundary:
- **Known inputs** (block inputs)
- **Expected outputs** (block outputs)
- **Can verify**: Does transform(inputs) = expected outputs?

**This is testable, verifiable correctness.**

---

## Part 7: Debugging Transformations

### The Problem

Chart is wrong. **Which transformation broke?**

With 200+ transformations:
```
url → data → dataset → ... (200 steps) ... → svg
```

**How do you find which step is wrong?**

### Without Blocks

```javascript
// Check each transformation individually?
console.log('data:', $.data);       // Correct
console.log('dataset:', $.dataset); // Correct
console.log('lines_00:', $.lines_00); // Wrong!
// Found it! lines_00 is broken
```

**Tedious. 200+ values to check.**

### With Blocks

```javascript
// Check at block boundaries
dataBlock.verify()    // ✓ Correct
linesBlock.verify()   // ✗ Wrong!
chartBlock.verify()   // ✗ Wrong (depends on lines)

// Found it! Lines block is broken
// Now check within lines block:
lines_00  // ✗ Wrong!
```

**Narrow down in O(log n) steps instead of O(n).**

**Blocks let you binary search for the broken transformation.**

---

## Part 8: The URL as Transformation Specification

### URLs Encode Transformations

```
/chart?dataset=5&currency=EUR&frequency=monthly&volume_unit=tonnes
```

**This URL specifies**:
- What data to load (dataset=5)
- How to transform it (currency=EUR, frequency=monthly)
- How to display it (volume_unit=tonnes)

**It's a transformation specification.**

### URL → Deterministic Output

**Key property**:
```
transform(URL) → SVG
```

**Should be deterministic** (assuming data doesn't change).

**Same URL should produce same SVG.**

### Verification

```javascript
// Capture baseline
const baseline = captureOutput('/chart?dataset=5&currency=EUR&...');

// After code change
const current = captureOutput('/chart?dataset=5&currency=EUR&...');

// Verify
if (baseline !== current) {
    throw new Error('Transformation changed!');
}
```

**This is snapshot testing for transformations.**

### Blocks Enable This

**Each block is a transformation with URL inputs**:
```javascript
linesBlock.transform({
    dataset: 5,
    currency: 'EUR',
    frequency: 'monthly'
})
```

**You can snapshot test each block**:
```javascript
test('lines block transformation is stable', () => {
    const output = linesBlock.transform(testInputs);
    expect(output).toMatchSnapshot();
});
```

**If the snapshot changes, you know which block's transformation broke.**

---

## Part 9: Separating Concerns

You said: "I've mixed core data transformations with UI stuff"

**This is key.**

### Two Kinds of Transformations

**1. Core Data Transformations**
```javascript
// Pure data → data
url → data
data → dataset
dataset + currency → lines
lines → charts
```

**2. UI Rendering**
```javascript
// Data → UI representation
charts → svg
mainpoints → table rows
dataset → form fields
```

**These should be separate.**

### Why?

**Core transformations**:
- Deterministic (same input → same output)
- Testable (snapshot outputs)
- Portable (can run anywhere)

**UI rendering**:
- Environment-dependent (DOM, canvas, etc.)
- Harder to test (visual output)
- Platform-specific (browser only)

### The Clean Separation

```javascript
// Core transformations (pure)
const data = auto({
    url: '/api/shrimp',
    currency: 'USD',

    data: async $ => fetch($.url),
    lines: $ => processLines($.data, $.currency),
    charts: $ => generateCharts($.lines)
});

// UI rendering (separate)
const ui = auto({
    svg: $ => renderSVG(data.charts),      // Uses data state
    table: $ => renderTable(data.lines)
});
```

**Core transformations can be tested/verified independently.**
**UI rendering is just the final display step.**

---

## Part 10: What Would Help

You asked: "What features would decrease complexity and increase understandability?"

### Based on Data Transformation Perspective

**1. Transformation Verification**
```javascript
// For each block, verify transformations
linesBlock.verify({
    inputs: { dataset, currency, frequency },
    expectedOutputs: snapshot
});
// Returns: ✓ or details of what changed
```

**2. Snapshot Testing**
```javascript
// Capture expected outputs
$.snapshot('baseline.json');

// After code change, compare
const diff = $.compare('baseline.json');
// → "charts.values[5] changed from 120 to 125"
```

**3. Transformation Isolation**
```javascript
// Test block in isolation
const output = linesBlock.isolate({
    dataset: mockDataset,
    currency: 'USD',
    frequency: 'monthly'
});
// Runs transformations without needing full app state
```

**4. Diff-Based Debugging**
```javascript
// What changed in the transformation pipeline?
const before = $.captureState();
$.currency = 'EUR';
const after = $.captureState();

const diff = $.diffTransformations(before, after);
// → {
//     changed: ['lines', 'charts'],
//     unchanged: ['data', 'dataset'],
//     reason: 'currency input changed'
//   }
```

**5. Block-Level Verification**
```javascript
// Each block tracks if transformations are correct
$.blocks.lines.verify();
// → ✓ All transformations match expected outputs

// Or detect which broke
$.blocks.lines.findBroken();
// → { broken: ['lines_03'], reason: 'output mismatch' }
```

---

## Part 11: The Core Insight

### It's Not About Reactivity

Reactivity is just **how** you maintain correctness automatically.

**The real goal**: Ensure transformations are correct.

```
Input Data + Settings  →  [Transformations]  →  Output

Correctness = Output matches expected transformation of inputs
```

### The Library Should Help You

**Verify**:
- Is this transformation correct?
- Does URL X still produce output Y?
- Did my code change break any transformations?

**Debug**:
- Which transformation broke?
- What changed in the output?
- Why did this value change?

**Test**:
- Snapshot transformation outputs
- Isolate blocks for testing
- Compare before/after

### This Is Different

Most reactive libraries focus on:
- Performance (fast updates)
- API (easy to use)
- Features (async, batching, etc.)

**You want**:
- **Correctness** (is the transformation right?)
- **Verifiability** (can I prove it's right?)
- **Debuggability** (why did it change?)

**This is a different focus. A more fundamental one.**

---

## Part 12: The Vision

### What This Library Could Be

**A system for composing verifiable data transformations**:

1. **Define transformations** (what you do now)
   ```javascript
   lines: $ => processLines($.dataset, $.currency)
   ```

2. **Group into blocks** (organizational)
   ```javascript
   linesBlock: { inputs, outputs, transformations }
   ```

3. **Capture baselines** (snapshot expected outputs)
   ```javascript
   linesBlock.baseline(testInputs, expectedOutputs)
   ```

4. **Verify correctness** (test transformations)
   ```javascript
   linesBlock.verify(inputs) → ✓ or diff
   ```

5. **Debug changes** (find what broke)
   ```javascript
   $.diffBlocks(before, after) → which block changed
   ```

**This would give you**:
- Confidence (transformations are correct)
- Clarity (can verify each block)
- Debuggability (can isolate issues)

### The Fundamental Shift

From: "Reactive state management library"
To: **"Data transformation verification system"**

**The goal isn't just automatic updates.**
**It's provable correctness of complex data transformations.**

---

## Part 13: Why This Matters

### The Real Complexity

Prices-app isn't complex because it has 200 functions.

**It's complex because it has 200 transformations that must be correct.**

And you can't manually verify:
- Currency conversion didn't break anything
- Frequency aggregation is accurate
- Volume unit conversion preserves precision
- Chart data matches raw data

**With thousands of combinations of inputs (datasets, currencies, frequencies, date ranges...)**

**Manual verification: impossible.**

### What You Need

**A system that helps you verify transformations at scale.**

- Test each block independently
- Snapshot expected outputs
- Detect when transformations change
- Debug which transformation broke

**This is about correctness, not just reactivity.**

---

## Conclusion

### The Realization

You're right: **This is about data transformation, not execution.**

**Each "function" is actually a transformation**:
```
transform: Inputs → Output
```

**The "graph" is actually a transformation pipeline**:
```
Input Data → Transform₁ → Transform₂ → ... → Output Data
```

**The "resolver" is actually a correctness maintainer**:
```
Ensure: output = transform(inputs) for all nodes
```

**"Blocks" are actually verification units**:
```
Test: block.transform(inputs) = expected outputs
```

### The Goal

**Not**: Fast reactive updates
**But**: **Correct data transformations**

**Not**: Automatic dependency tracking
**But**: **Verifiable transformation pipelines**

**Not**: State management
**But**: **Provable correctness of complex data flow**

### What Would Help

Features that support:
1. **Verification** - Is this transformation correct?
2. **Isolation** - Test transformations independently
3. **Comparison** - Did my code change break anything?
4. **Debugging** - Which transformation is wrong?

**This is a different kind of library.**

**Not just reactive state management.**
**A system for verifiable data transformations.**

---

**You're not far from this clarity.**

**You've identified what it really is: A data transformation system where correctness is the primary concern.**

The features you want to add (blocks, verification, diffing) all serve this goal.

**The next step**: Build the library around this core truth.

Not "auto.js - reactive state management"
But **"auto.js - verifiable data transformations"**

That's what it really is.
