Graph-First Kernel: Subscription Support & Dynamic Parameter Detection

  Summary

  Successfully implemented subscription support and fixed dependency tracking for the graph-first Auto.js kernel. The kernel now passes subscription tests and supports flexible parameter naming in computed functions.

  Issues Fixed

  1. Dependency Tracking Filter (Tests 002 & 003)

  Problem:
  - Test 002 expected deps: {} (static values excluded)
  - Test 003 expected deps: { func: [] } (computed functions included, even with no deps)
  - Original filter removed ALL nodes with zero dependencies

  Root Cause:
  // WRONG: Filters out all nodes with empty dependencies
  .filter(([_, v]) => v.size > 0)

  Solution:
  Filter by node type instead of dependency count:
  // CORRECT: Only include computed nodes (regardless of dependency count)
  .filter(([k, _]) => graph.nodes.get(k)?.type === 'computed')

  File: src/auto-layered.js:50

  ---
  2. Subscription API Implementation

  Problem:
  Subscription API ($['#'].varName.subscribe(callback)) was not implemented.

  Solution:
  Implemented a complete subscription system across multiple layers:

  Layer 3: ReactiveSystem (layer3-reactive.js)

  Added subscription tracking:
  this.subscriptions = new Map();  // name -> Map(id -> callback)
  this.nextSubId = 0;
  this.freedSubIds = [];  // Reuse freed IDs for test compatibility

  Key methods:
  - subscribe(name, callback) - Register callback, call immediately, return unsubscribe function
  - _notifySubscribers(name, value) - Trigger all callbacks for a variable
  - Modified set() and _compute() to notify subscribers on value changes

  ID Reuse:
  Subscription IDs are reused when freed (e.g., ['000', '002', '001'] after unsubscribing '001'), matching the original Auto.js behavior.

  Layer 4: Auto-layered (auto-layered.js)

  Implemented # proxy for subscription API:
  if (prop === '#') {
      return new Proxy({}, {
          get(_, varName) {
              return {
                  subscribe: (callback) => target.subscribe(varName, callback)
              };
          }
      });
  }

  Added subs to introspection ($._):
  const subs = {};
  for (let [varName, subMap] of target.subscriptions) {
      subs[varName] = Array.from(subMap.keys());
  }

  Tests Passing:
  - ✅ 015_subscribe
  - ✅ 016_unsubscribe
  - ✅ 017_unsubscribe_gaps (ID reuse)
  - ✅ 019_check_subscribe_effects
  - ✅ 020_check_only_subs_update
  - ✅ 021_check_subs_on_dependency_chain
  - ✅ 028_subscribe_not_function_side_effects

  ---
  3. Dynamic Parameter Name Detection

  Problem:
  StaticAnalysisBuilder was hardcoded to only detect $ as the parameter name. Functions using other names like _ failed:
  derived: (_) => _.data ? _.data.length : 0  // FAILED

  Your Insight:
  "If we can detect a function uses _ instead of $, why not just use it?"

  Solution:
  Dynamic parameter extraction and pattern matching:

  // Extract parameter name from function signature
  const paramMatch = source.match(/^\s*(?:function\s*)?\(?\s*(\$|\w+)\s*\)?\s*=>/);
  const paramName = paramMatch ? paramMatch[1] : '$';

  // Escape special regex characters ($ becomes \$)
  const escapedParam = paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Use word boundary only for word characters (not for $)
  const boundary = /^\w+$/.test(paramName) ? '\\b' : '';

  // Build dynamic pattern
  const directPattern = new RegExp(`${boundary}${escapedParam}\\.(\\w+)`, 'g');

  Now Supports:
  - ($) => $.data ✅
  - (_) => _.data ✅
  - (state) => state.data ✅
  - (x) => x.data ✅

  File: src/layer2-graph-builder.js:66-113

  Additional Tests Now Passing:
  - ✅ 005_dependent_function
  - ✅ 029_sub_must_update
  - ✅ 033_out_of_order_deps
  - ✅ 035_more_out_of_order
  - ✅ 036_complete_leaves

  ---
  Technical Details

  Edge Cases Handled

  1. Special Character Escaping: $ is a regex metacharacter, requiring escape to \$
  2. Word Boundaries: \b doesn't work with $, only applied for word characters
  3. Subscription ID Reuse: Freed IDs stored in sorted array and reused on next subscribe
  4. Change Detection: Only notify subscribers when values actually change (oldValue !== newValue)
  5. Immediate Callback: Subscriptions call callback immediately with current value

  Pattern Matching

  StaticAnalysisBuilder now detects three patterns with any parameter name:

  1. Direct access: paramName.property
  2. Bracket notation: paramName['property'] or paramName["property"]
  3. Destructuring: const { x, y } = paramName

  ---
  Results

  The graph-first kernel now:
  - ✅ Properly tracks dependencies for both static and computed nodes
  - ✅ Fully supports subscription API with ID reuse
  - ✅ Accepts any parameter name in computed functions
  - ✅ Passes all core subscription tests
  - ✅ Maintains compatibility with original Auto.js test suite

  Key Improvement: Removed arbitrary restrictions (hardcoded $) while maintaining correctness and test compatibility.

