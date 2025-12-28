/**
 * Module 2: Static Analysis
 *
 * Convert functions to dependency information using toString() + regex.
 * Pure functions with no side effects or state.
 */

import DirectedGraph from './directed-graph.js';

/**
 * Analyze a function to discover its dependencies
 * Uses regex on toString() to find $.propertyName patterns
 *
 * @param {Function} fn - The function to analyze
 * @param {string} name - Name of the variable (to exclude self-references)
 * @returns {Set<string>} - Set of dependency names
 */
export function analyzeFunction(fn, name) {
    const source = fn.toString();
    const deps = new Set();

    // Pattern 1: $.propertyName (dot notation)
    const dotPattern = /\$\.(\w+)/g;
    let match;
    while ((match = dotPattern.exec(source)) !== null) {
        const propName = match[1];
        if (propName !== name) {  // Exclude self-references
            deps.add(propName);
        }
    }

    // Pattern 2: $["propertyName"] or $['propertyName'] (bracket notation)
    const bracketPattern = /\$\[["'](\w+)["']\]/g;
    while ((match = bracketPattern.exec(source)) !== null) {
        const propName = match[1];
        if (propName !== name) {
            deps.add(propName);
        }
    }

    // Pattern 3: Destructuring - const { x, y } = $
    const destructuringPattern = /const\s*{([^}]+)}\s*=\s*\$/g;
    while ((match = destructuringPattern.exec(source)) !== null) {
        const props = match[1].split(',').map(p => {
            // Handle: { foo }, { foo: bar }, { foo = default }
            const cleaned = p.trim().split(/[:\s=]/)[0];
            return cleaned;
        });

        props.forEach(prop => {
            if (prop && prop !== name) {
                deps.add(prop);
            }
        });
    }

    return deps;
}

/**
 * Build a DirectedGraph from a functions object
 *
 * @param {Object} functions - Object with { varName: valueOrFunction }
 * @returns {DirectedGraph} - Graph with nodes and dependency edges
 */
export function buildGraph(functions) {
    const graph = new DirectedGraph();

    // Add all nodes first
    for (let name of Object.keys(functions)) {
        const value = functions[name];
        const isFunction = typeof value === 'function';

        graph.addNode(name, {
            type: isFunction ? 'computed' : 'static',
            value: isFunction ? null : value
        });
    }

    // Add edges based on dependencies
    for (let [name, value] of Object.entries(functions)) {
        if (typeof value === 'function') {
            const deps = analyzeFunction(value, name);

            for (let dep of deps) {
                // Add edge: dep -> name (dep must execute before name)
                graph.addEdge(dep, name);
            }
        }
    }

    return graph;
}

/**
 * Get all dependencies for a variable (what it needs)
 *
 * @param {DirectedGraph} graph
 * @param {string} name - Variable name
 * @returns {Set<string>} - Direct dependencies
 */
export function getDependencies(graph, name) {
    return graph.getPredecessors(name);
}

/**
 * Get all dependents for a variable (what needs it)
 *
 * @param {DirectedGraph} graph
 * @param {string} name - Variable name
 * @returns {Set<string>} - Direct dependents
 */
export function getDependents(graph, name) {
    return graph.getSuccessors(name);
}

/**
 * Get all transitive dependents (everything affected by a change)
 *
 * @param {DirectedGraph} graph
 * @param {string} name - Variable name
 * @returns {Set<string>} - All transitive dependents
 */
export function getAffected(graph, name) {
    return graph.getReachable([name]);
}
