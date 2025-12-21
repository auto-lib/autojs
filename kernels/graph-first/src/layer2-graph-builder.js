/**
 * LAYER 2: Graph Builder Strategies
 *
 * Different strategies for building a dependency graph from Auto.js definitions.
 * Knows about Auto.js specifics (functions, $, dependencies).
 */

import DirectedGraph from './layer1-graph.js';

/**
 * Abstract base class for graph building strategies
 */
class GraphBuilder {
    build(definition) {
        throw new Error('Subclass must implement build()');
    }
}

/**
 * Strategy 1: Static Analysis
 * Parse function source code to find all possible dependencies
 */
class StaticAnalysisBuilder extends GraphBuilder {
    constructor(options = {}) {
        super();
        this.options = options;
    }

    build(definition) {
        const graph = new DirectedGraph();

        // First pass: Add all nodes
        for (let [name, value] of Object.entries(definition)) {
            const isFunction = typeof value === 'function';
            graph.addNode(name, {
                type: isFunction ? 'computed' : 'static',
                fn: isFunction ? value : null,
                initialValue: isFunction ? undefined : value
            });
        }

        // Second pass: Discover dependencies via static analysis
        for (let [name, metadata] of graph.nodes) {
            if (metadata.type === 'computed') {
                const deps = this._analyzeFunction(metadata.fn, name);

                // Add edges: dependency -> dependent
                // (dep executes before name)
                for (let dep of deps) {
                    if (graph.has(dep)) {
                        graph.addEdge(dep, name);
                    } else if (this.options.strict) {
                        throw new Error(`${name} references unknown variable: ${dep}`);
                    }
                }
            }
        }

        return graph;
    }

    /**
     * Parse function source to find property accesses
     * Supports any parameter name: ($), (_), (state), etc.
     */
    _analyzeFunction(fn, name) {
        const source = fn.toString();
        const deps = new Set();

        // Extract parameter name from function signature
        // Matches: ($) =>, _ =>, (state) =>, function($), etc.
        const paramMatch = source.match(/^\s*(?:function\s*)?\(?\s*(\$|\w+)\s*\)?\s*=>/);
        const paramName = paramMatch ? paramMatch[1] : '$';  // Default to $ if no match

        // Escape special regex characters in parameter name
        const escapedParam = paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Use word boundary only for word characters (not for $)
        const boundary = /^\w+$/.test(paramName) ? '\\b' : '';

        // Pattern 1: paramName.propertyName (e.g., $.data or _.data)
        const directPattern = new RegExp(`${boundary}${escapedParam}\\.(\\w+)`, 'g');
        let match;
        while ((match = directPattern.exec(source)) !== null) {
            if (match[1] !== name) {  // Don't include self
                deps.add(match[1]);
            }
        }

        // Pattern 2: paramName["propertyName"] or paramName['propertyName']
        const bracketPattern = new RegExp(`${boundary}${escapedParam}\\[["'](\\w+)["']\\]`, 'g');
        while ((match = bracketPattern.exec(source)) !== null) {
            if (match[1] !== name) {
                deps.add(match[1]);
            }
        }

        // Pattern 3: Destructuring { x, y } = paramName
        const destructuringPattern = new RegExp(`const\\s*{([^}]+)}\\s*=\\s*${escapedParam}`, 'g');
        while ((match = destructuringPattern.exec(source)) !== null) {
            const props = match[1].split(',').map(p => {
                // Handle: { foo }, { foo: bar }, { foo = default }
                return p.trim().split(/[:\s=]/)[0];
            });
            props.forEach(prop => {
                if (prop && prop !== name) {
                    deps.add(prop);
                }
            });
        }

        return deps;
    }
}

/**
 * Strategy 2: Runtime Tracking
 * Discover dependencies by running functions with a proxy
 */
class RuntimeTrackingBuilder extends GraphBuilder {
    constructor(options = {}) {
        super();
        this.options = options;
    }

    build(definition) {
        const graph = new DirectedGraph();

        // First pass: Add all nodes
        for (let [name, value] of Object.entries(definition)) {
            const isFunction = typeof value === 'function';
            graph.addNode(name, {
                type: isFunction ? 'computed' : 'static',
                fn: isFunction ? value : null,
                initialValue: isFunction ? undefined : value
            });
        }

        // Second pass: Track execution
        for (let [name, metadata] of graph.nodes) {
            if (metadata.type === 'computed') {
                const deps = this._trackExecution(metadata.fn, name, definition);

                for (let dep of deps) {
                    if (graph.has(dep)) {
                        graph.addEdge(dep, name);
                    }
                }
            }
        }

        return graph;
    }

    /**
     * Run function with proxy to track property accesses
     */
    _trackExecution(fn, name, definition) {
        const accessed = new Set();

        // Create proxy that tracks accesses
        const proxy = new Proxy({}, {
            get(target, prop) {
                if (prop !== name) {
                    accessed.add(prop);
                }
                // Return initial value or undefined
                return definition[prop];
            }
        });

        try {
            fn(proxy);
        } catch (e) {
            // Expected - function may fail with undefined values
            // But we got the access tracking we need
        }

        return accessed;
    }

    /**
     * Update graph at runtime (for mutable graph variant)
     */
    updateDependencies(graph, name, newDeps) {
        // Remove old edges from this node
        const oldSuccessors = Array.from(graph.getSuccessors(name));
        for (let succ of oldSuccessors) {
            graph.removeEdge(name, succ);
        }

        // Add new edges
        for (let dep of newDeps) {
            if (graph.has(dep)) {
                graph.addEdge(dep, name);
            }
        }
    }
}

/**
 * Strategy 3: Explicit Declaration
 * User provides dependencies manually
 */
class ExplicitBuilder extends GraphBuilder {
    constructor(options = {}) {
        super();
        this.options = options;
    }

    build(definition) {
        const graph = new DirectedGraph();

        // Add all nodes
        for (let [name, value] of Object.entries(definition)) {
            if (value && typeof value === 'object' && value.__computed) {
                // Explicit computed value: { deps: [...], fn: ... }
                graph.addNode(name, {
                    type: 'computed',
                    fn: value.fn,
                    initialValue: undefined,
                    declaredDeps: value.deps
                });

                // Validate declared dependencies exist
                for (let dep of value.deps) {
                    if (!(dep in definition)) {
                        throw new Error(
                            `${name} declares dependency on '${dep}' which doesn't exist`
                        );
                    }
                }

                // Add edges
                for (let dep of value.deps) {
                    graph.addEdge(dep, name);
                }
            } else {
                // Regular value or function
                const isFunction = typeof value === 'function';
                graph.addNode(name, {
                    type: isFunction ? 'computed' : 'static',
                    fn: isFunction ? value : null,
                    initialValue: isFunction ? undefined : value
                });

                // Fallback to runtime tracking for regular functions
                if (isFunction) {
                    const tracker = new RuntimeTrackingBuilder();
                    const deps = tracker._trackExecution(value, name, definition);
                    for (let dep of deps) {
                        graph.addEdge(dep, name);
                    }
                }
            }
        }

        return graph;
    }
}

/**
 * Helper for explicit dependencies
 */
export function computed(deps, fn) {
    return {
        __computed: true,
        deps: deps,
        fn: fn
    };
}

export {
    GraphBuilder,
    StaticAnalysisBuilder,
    RuntimeTrackingBuilder,
    ExplicitBuilder
};
