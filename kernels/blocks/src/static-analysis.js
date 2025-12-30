/**
 * Module 2: Static Analysis
 *
 * Convert functions to dependency information using toString() + regex.
 * Pure functions with no side effects or state.
 */

import DirectedGraph from './directed-graph.js';

/**
 * Analyze a function to discover its dependencies
 * Uses regex on toString() to find paramName.propertyName patterns
 *
 * @param {Function} fn - The function to analyze
 * @param {string} name - Name of the variable (to exclude self-references)
 * @returns {Set<string>} - Set of dependency names
 */
export function analyzeFunction(fn, name) {
    const source = fn.toString();
    const deps = new Set();

    // Extract parameter name from function signature
    // Handles: ($) =>, (_, set) =>, $ =>, function($), async ($) =>, etc.
    let paramName = '$';

    // Try arrow function: ($) =>, (_, set) =>, $ =>, async ($) =>, etc.
    const arrowMatch = source.match(/^\s*(?:async\s+)?\(?\s*(\w+)/);
    if (arrowMatch) {
        paramName = arrowMatch[1];
    } else {
        // Traditional function: function($) or function name($)
        const funcMatch = source.match(/^(?:async\s+)?function\s+\w*\s*\(\s*(\w+)/);
        if (funcMatch) {
            paramName = funcMatch[1];
        }
    }

    // Escape special regex characters in param name
    const escapedParam = paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Pattern 1: paramName.propertyName (dot notation)
    const dotPattern = new RegExp(`${escapedParam}\\.(\\w+)`, 'g');
    let match;
    while ((match = dotPattern.exec(source)) !== null) {
        const propName = match[1];
        if (propName !== name) {  // Exclude self-references
            deps.add(propName);
        }
    }

    // Pattern 2: paramName["propertyName"] or paramName['propertyName'] (bracket notation)
    const bracketPattern = new RegExp(`${escapedParam}\\[["'](\\w+)["']\\]`, 'g');
    while ((match = bracketPattern.exec(source)) !== null) {
        const propName = match[1];
        if (propName !== name) {
            deps.add(propName);
        }
    }

    // Pattern 3: Destructuring - const/let/var { x, y } = paramName
    // Use negative lookahead to ensure $ is not followed by a dot ($.something)
    const destructuringPattern = new RegExp(`(?:const|let|var)\\s*{([^}]+)}\\s*=\\s*${escapedParam}(?!\\.)`, 'g');
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
