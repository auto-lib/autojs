/**
 * Auto.js - Three-Layer Architecture
 *
 * Ties together the three layers:
 * 1. DirectedGraph (pure graph data structure)
 * 2. GraphBuilder (strategies for building the graph)
 * 3. ReactiveSystem (reactive computations using the graph)
 */

import DirectedGraph from './layer1-graph.js';
import { StaticAnalysisBuilder, RuntimeTrackingBuilder, ExplicitBuilder, computed } from './layer2-graph-builder.js';
import ReactiveSystem from './layer3-reactive.js';

/**
 * Main auto() function
 */
function auto(definition, options = {}) {
    // Layer 2: Build the graph using chosen strategy
    const builder = options.builder || new StaticAnalysisBuilder(options);
    const graph = builder.build(definition);

    // Validate graph
    if (graph.hasCycle()) {
        const cycles = graph.getCycles();
        throw new Error(`Circular dependencies detected: ${cycles.map(c => c.join(' -> ')).join('; ')}`);
    }

    // Layer 3: Create reactive system
    const reactive = new ReactiveSystem(graph, options);

    // Create user-facing API
    const proxy = new Proxy(reactive, {
        get(target, prop) {
            // Introspection
            if (prop === '_') {
                return {
                    graph: graph,
                    deps: Object.fromEntries(
                        Array.from(graph.edges.entries()).map(([k, v]) => [k, Array.from(v)])
                    ),
                    dependents: Object.fromEntries(
                        Array.from(graph.reverseEdges.entries()).map(([k, v]) => [k, Array.from(v)])
                    ),
                    fn: Array.from(graph.nodes.entries())
                        .filter(([_, meta]) => meta.type === 'computed')
                        .map(([name, _]) => name),
                    value: Object.fromEntries(target.values),
                    dirty: Array.from(target.dirty),
                    order: graph.topologicalSort(),
                };
            }

            // Methods
            if (prop === 'flush') {
                return () => target.flush();
            }

            if (prop === 'visualize') {
                return () => graph.toDot({
                    nodeLabels: (id, metadata) => {
                        const type = metadata.type === 'static' ? '📊' : '⚙️';
                        return `${type} ${id}`;
                    }
                });
            }

            if (prop === 'snapshot') {
                return () => target.snapshot();
            }

            // Normal property access
            return target.get(prop);
        },

        set(target, prop, value) {
            // Prevent setting special properties
            if (prop === '_' || prop === 'flush' || prop === 'visualize' || prop === 'snapshot') {
                throw new Error(`Cannot set reserved property: ${prop}`);
            }

            target.set(prop, value);
            return true;
        }
    });

    return proxy;
}

/**
 * Pre-configured factory functions for different strategies
 */
auto.static = (definition, options = {}) => {
    return auto(definition, {
        ...options,
        builder: new StaticAnalysisBuilder(options)
    });
};

auto.runtime = (definition, options = {}) => {
    return auto(definition, {
        ...options,
        builder: new RuntimeTrackingBuilder(options)
    });
};

auto.explicit = (definition, options = {}) => {
    return auto(definition, {
        ...options,
        builder: new ExplicitBuilder(options)
    });
};

// Export main function and utilities
export default auto;
export { computed, StaticAnalysisBuilder, RuntimeTrackingBuilder, ExplicitBuilder };

// Also export the layers for advanced usage
export { DirectedGraph, ReactiveSystem };
