/**
 * Example: Three-Layer Architecture
 *
 * Demonstrates how the three layers work independently and together
 */

import DirectedGraph from './src/layer1-graph.js';
import { StaticAnalysisBuilder, RuntimeTrackingBuilder, computed } from './src/layer2-graph-builder.js';
import ReactiveSystem from './src/layer3-reactive.js';
import auto from './src/auto-layered.js';

console.log('=== THREE-LAYER ARCHITECTURE DEMO ===\n');

// =============================================================================
// LAYER 1: Using DirectedGraph independently
// =============================================================================

console.log('--- LAYER 1: Pure Graph (not Auto.js specific) ---\n');

// Build a task dependency graph
const tasks = new DirectedGraph();
tasks.addNode('install', { command: 'npm install' });
tasks.addNode('build', { command: 'npm run build' });
tasks.addNode('test', { command: 'npm test' });
tasks.addNode('deploy', { command: 'npm run deploy' });

// Dependencies
tasks.addEdge('install', 'build');  // build needs install
tasks.addEdge('build', 'test');     // test needs build
tasks.addEdge('test', 'deploy');    // deploy needs test

console.log('Task execution order:', tasks.topologicalSort());
console.log('What depends on build?', Array.from(tasks.getReachable(['build'])));
console.log();

// =============================================================================
// LAYER 2: Building graphs from Auto.js definitions
// =============================================================================

console.log('--- LAYER 2: Graph Builders (strategies) ---\n');

const definition = {
    enabled: false,
    data: [1, 2, 3],
    extra: 'info',
    result: ($) => {
        if (!$.enabled) return 'N/A';
        return $.data.length + ' ' + $.extra;
    }
};

// Strategy 1: Static Analysis
console.log('Strategy 1: Static Analysis');
const staticBuilder = new StaticAnalysisBuilder();
const staticGraph = staticBuilder.build(definition);
console.log('  Dependencies found:',
    Object.fromEntries(
        Array.from(staticGraph.reverseEdges.entries())
            .filter(([_, v]) => v.size > 0)
            .map(([k, v]) => [k, Array.from(v)])
    )
);
console.log('  (Finds ALL possible dependencies, even in unexecuted branches)');
console.log();

// Strategy 2: Runtime Tracking
console.log('Strategy 2: Runtime Tracking');
const runtimeBuilder = new RuntimeTrackingBuilder();
const runtimeGraph = runtimeBuilder.build(definition);
console.log('  Dependencies found:',
    Object.fromEntries(
        Array.from(runtimeGraph.reverseEdges.entries())
            .filter(([_, v]) => v.size > 0)
            .map(([k, v]) => [k, Array.from(v)])
    )
);
console.log('  (Finds only what was accessed during initial execution)');
console.log();

// =============================================================================
// LAYER 3: Reactive system using a graph
// =============================================================================

console.log('--- LAYER 3: Reactive System (uses any graph) ---\n');

// Create a simple graph manually
const graph = new DirectedGraph();
graph.addNode('x', { type: 'static', initialValue: 5 });
graph.addNode('y', { type: 'static', initialValue: 3 });
graph.addNode('sum', {
    type: 'computed',
    fn: ($) => $.x + $.y
});
graph.addEdge('x', 'sum');
graph.addEdge('y', 'sum');

// Create reactive system from the graph
const reactive = new ReactiveSystem(graph);
console.log('Initial sum:', reactive.get('sum'));

reactive.set('x', 10);
console.log('After x=10, sum:', reactive.get('sum'));

reactive.set('y', 7);
console.log('After y=7, sum:', reactive.get('sum'));
console.log();

// =============================================================================
// INTEGRATED: Using auto() API
// =============================================================================

console.log('--- INTEGRATED: Full Auto.js API ---\n');

console.log('1. Default (static analysis):');
const $1 = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => `Got ${$.count} items`
});

console.log('   Initial:', { count: $1.count, msg: $1.msg });
$1.data = [1, 2, 3, 4, 5];
console.log('   After data=[1,2,3,4,5]:', { count: $1.count, msg: $1.msg });
console.log('   Graph:', $1._.deps);
console.log();

console.log('2. Runtime tracking strategy:');
const $2 = auto.runtime({
    mode: 'simple',
    data: [1, 2, 3],
    extra: 'info',
    result: ($) => {
        if ($.mode === 'simple') {
            return $.data.length;
        } else {
            return $.data.join(',') + ' ' + $.extra;
        }
    }
});

console.log('   Initial (mode=simple):', $2.result);
console.log('   Tracked deps:', $2._.deps.result);
$2.mode = 'detailed';
console.log('   After mode=detailed:', $2.result);
console.log('   Updated deps:', $2._.deps.result);
console.log();

console.log('3. Explicit dependencies:');
const $3 = auto.explicit({
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

console.log('   Initial:', $3.display);
$3.showDetails = true;
console.log('   After showDetails=true:', $3.display);
$3.age = 31;
console.log('   After age=31:', $3.display);
console.log();

// =============================================================================
// VISUALIZATION
// =============================================================================

console.log('--- VISUALIZATION ---\n');

const $viz = auto({
    a: 1,
    b: 2,
    c: ($) => $.a + $.b,
    d: ($) => $.c * 2,
    e: ($) => $.c + $.d
});

console.log('GraphViz DOT format:');
console.log($viz.visualize());
console.log();

// =============================================================================
// USING LAYERS INDEPENDENTLY
// =============================================================================

console.log('--- MIXING LAYERS (advanced usage) ---\n');

// Build a graph with one strategy
const graphFromStatic = new StaticAnalysisBuilder().build({
    x: 1,
    y: 2,
    sum: ($) => $.x + $.y
});

// Use it with ReactiveSystem
const customReactive = new ReactiveSystem(graphFromStatic);
console.log('Custom reactive system, sum:', customReactive.get('sum'));
customReactive.set('x', 10);
console.log('After x=10, sum:', customReactive.get('sum'));
console.log();

// Or build graph manually and use with reactive system
const manualGraph = new DirectedGraph();
manualGraph.addNode('width', { type: 'static', initialValue: 100 });
manualGraph.addNode('height', { type: 'static', initialValue: 50 });
manualGraph.addNode('area', {
    type: 'computed',
    fn: ($) => $.width * $.height
});
manualGraph.addEdge('width', 'area');
manualGraph.addEdge('height', 'area');

const areaReactive = new ReactiveSystem(manualGraph);
console.log('Manual graph, area:', areaReactive.get('area'));
console.log();

console.log('=== DEMO COMPLETE ===');
