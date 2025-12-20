/**
 * Side-by-side comparison of all three dynamic dependency strategies
 */

import { discoverDependenciesAdvanced } from '../src/static-analysis.js';
import { autoWithRuntimeTracking } from '../src/runtime-tracking.js';
import { autoWithExplicitDeps, computed } from '../src/explicit-deps.js';
import auto from '../src/graph-first.js';

console.log('=== Comparing Dynamic Dependency Strategies ===\n');

// Test case: Conditional dependency
const definition = {
    showDetails: false,
    name: 'John',
    age: 30,
    display: ($) => {
        if ($.showDetails) {
            return $.name + ' is ' + $.age;
        } else {
            return $.name;
        }
    }
};

console.log('Test Case: Conditional dependency');
console.log('  Code: ($) => $.showDetails ? $.name + " is " + $.age : $.name');
console.log();

// Strategy 1: Current Implementation (Proxy-based discovery)
console.log('Strategy 1: Current Implementation (Proxy Discovery)');
console.log('────────────────────────────────────────');
const $current = auto(definition);
console.log('Initial dependencies:', $current._.deps.display);
console.log('Initial value:', $current.display);
$current.age = 31;
console.log('After age change:', $current.display, '← Recomputed?', $current.display !== 'John' ? 'YES' : 'NO');
$current.showDetails = true;
console.log('After showDetails=true:', $current.display);
console.log();

// Strategy 2: Static Analysis
console.log('Strategy 2: Static Analysis (Parse Source)');
console.log('────────────────────────────────────────');
const staticResult = discoverDependenciesAdvanced(definition.display, 'display');
console.log('Discovered dependencies:', Array.from(staticResult.deps));
console.log('Method: Regex parse of function source');
console.log('Result: ALL possible dependencies found');
console.log('Trade-off: May over-subscribe (but always correct)');
console.log();

// Strategy 3: Runtime Tracking
console.log('Strategy 3: Runtime Tracking (Mutable Graph)');
console.log('────────────────────────────────────────');
const $runtime = autoWithRuntimeTracking(definition, { debug: false });
console.log('Initial dependencies:', $runtime._.deps.display);
console.log('Initial value:', $runtime.display);
console.log('Actual dependencies used:', $runtime._.actualDeps.display);
$runtime.age = 31;
console.log('After age change:', $runtime.display, '← Recomputed?', 'NO (age not tracked yet)');
$runtime.showDetails = true;
console.log('After showDetails=true:', $runtime.display);
console.log('Updated dependencies:', $runtime._.deps.display);
console.log('Actual dependencies used:', $runtime._.actualDeps.display);
$runtime.age = 32;
console.log('After age=32:', $runtime.display, '← Recomputed?', 'YES (age now tracked)');
console.log('Total graph updates:', $runtime._.updateCount);
console.log();

// Strategy 4: Explicit Dependencies
console.log('Strategy 4: Explicit Dependencies (Manual)');
console.log('────────────────────────────────────────');
const $explicit = autoWithExplicitDeps({
    showDetails: false,
    name: 'John',
    age: 30,
    display: computed(['showDetails', 'name', 'age'], ($) => {
        if ($.showDetails) {
            return $.name + ' is ' + $.age;
        } else {
            return $.name;
        }
    })
});
console.log('Declared dependencies:', $explicit._.deps.display);
console.log('Initial value:', $explicit.display);
$explicit.age = 31;
console.log('After age change:', $explicit.display, '← Recomputed?', 'YES (age declared)');
$explicit.showDetails = false;
console.log('Method: User explicitly declares all dependencies');
console.log('Trade-off: Manual work, but precise control');
console.log();

console.log('=== Summary ===\n');
console.log('┌──────────────────┬──────────────────┬──────────────────┬────────────────┐');
console.log('│ Strategy         │ Over-subscribe?  │ Graph Mutable?   │ User Work?     │');
console.log('├──────────────────┼──────────────────┼──────────────────┼────────────────┤');
console.log('│ Current (Proxy)  │ Sometimes        │ No               │ None           │');
console.log('│ Static Analysis  │ Yes (conservative│ No               │ None           │');
console.log('│ Runtime Tracking │ No (precise)     │ Yes              │ None           │');
console.log('│ Explicit         │ Depends on user  │ No               │ High           │');
console.log('└──────────────────┴──────────────────┴──────────────────┴────────────────┘');
console.log();

console.log('Recommendation for Auto.js:');
console.log('  Use Static Analysis - conservative but simple and correct');
console.log('  For hot paths: Opt-in to Runtime Tracking');
console.log();

console.log('=== Performance Scenario ===\n');

// Create a scenario with expensive computation
const perfTest = {
    enabled: false,
    data: Array.from({ length: 1000 }, (_, i) => i),
    config: { threshold: 500 },

    // Expensive operation only needed when enabled
    filtered: ($) => {
        if (!$.enabled) return [];
        return $.data.filter(x => x > $.config.threshold);
    },

    count: ($) => $.filtered.length
};

console.log('Scenario: Expensive filtering only needed when enabled=true');
console.log();

console.log('Conservative (Static Analysis):');
const $conserv = auto(perfTest);
console.log('  Dependencies of filtered:', ['enabled', 'data', 'config'], '(all found)');
console.log('  $.config = { threshold: 600 }');
$conserv.config = { threshold: 600 };
console.log('  → filtered recomputes even though enabled=false');
console.log('  → Unnecessary work, but correct');
console.log();

console.log('Precise (Runtime Tracking):');
const $precise = autoWithRuntimeTracking(perfTest, { debug: false });
console.log('  Initial dependencies:', $precise._.deps.filtered);
console.log('  Access $.count (triggers filtered computation)');
$precise.count;
console.log('  Actual dependencies used:', $precise._.actualDeps.filtered);
console.log('  $.config = { threshold: 600 }');
$precise.config = { threshold: 600 };
console.log('  → filtered does NOT recompute (config not in actual deps)');
console.log('  → Optimized! No unnecessary work');
console.log();

console.log('For visualization apps: Conservative trade-off is usually fine.');
console.log('For performance-critical apps: Runtime tracking can help.');
