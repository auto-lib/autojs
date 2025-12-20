/**
 * Strategy 1: Static Analysis for Dependency Discovery
 *
 * Parse function source code to find all possible dependencies.
 * Conservative approach - finds ALL $.property accesses.
 */

/**
 * Basic static analysis - regex matching
 */
export function discoverDependenciesStatic(fn, name) {
    const source = fn.toString();

    // Match patterns like $.propertyName
    const regex = /\$\.(\w+)/g;
    const deps = new Set();
    let match;

    while ((match = regex.exec(source)) !== null) {
        const propName = match[1];
        // Don't include self-references
        if (propName !== name) {
            deps.add(propName);
        }
    }

    return deps;
}

/**
 * Advanced static analysis with edge case handling
 */
export function discoverDependenciesAdvanced(fn, name, options = {}) {
    const source = fn.toString();
    const deps = new Set();
    const warnings = [];

    // Pattern 1: $.propertyName (most common)
    const directAccess = /\$\.(\w+)/g;
    let match;

    while ((match = directAccess.exec(source)) !== null) {
        const propName = match[1];
        if (propName !== name) {
            deps.add(propName);
        }
    }

    // Pattern 2: $["propertyName"] or $['propertyName'] (bracket notation)
    const bracketAccess = /\$\[["'](\w+)["']\]/g;
    while ((match = bracketAccess.exec(source)) !== null) {
        const propName = match[1];
        if (propName !== name) {
            deps.add(propName);
        }
    }

    // Pattern 3: Detect dynamic access (can't statically determine)
    if (/\$\[[^"'\]]/g.test(source)) {
        warnings.push({
            node: name,
            type: 'dynamic-access',
            message: 'Dynamic property access detected - dependencies may be incomplete',
            example: source.match(/\$\[[^\]]+\]/)?.[0]
        });
    }

    // Pattern 4: Detect destructuring (harder to track)
    const destructuringPattern = /const\s*{([^}]+)}\s*=\s*\$/g;
    while ((match = destructuringPattern.exec(source)) !== null) {
        // Try to extract property names from destructuring
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

        if (options.warnDestructuring) {
            warnings.push({
                node: name,
                type: 'destructuring',
                message: 'Destructuring detected - verify all dependencies captured',
                example: match[0]
            });
        }
    }

    // Pattern 5: Detect spread operator (can't track)
    if (/\.\.\.\$/g.test(source)) {
        warnings.push({
            node: name,
            type: 'spread',
            message: 'Spread operator detected - cannot determine dependencies',
            example: source.match(/\.\.\.\$/)?.[0]
        });
    }

    if (options.debug && warnings.length > 0) {
        console.warn(`Dependency discovery warnings for '${name}':`, warnings);
    }

    return { deps, warnings };
}

/**
 * Create a ReactiveGraph that uses static analysis
 */
export class StaticAnalysisGraph {
    constructor(definition, options = {}) {
        this.options = options;
        this.nodes = new Map();
        this.edges = new Map();
        this.reverseEdges = new Map();
        this.executionOrder = [];
        this.warnings = [];

        this._build(definition);
        this._validate();
        this._computeExecutionOrder();
    }

    _build(definition) {
        // First pass: identify nodes
        for (let [name, value] of Object.entries(definition)) {
            const isFunction = typeof value === 'function';
            this.nodes.set(name, {
                name,
                type: isFunction ? 'computed' : 'static',
                fn: isFunction ? value : null
            });
        }

        // Second pass: discover dependencies using static analysis
        for (let [name, node] of this.nodes) {
            if (node.type === 'computed') {
                const result = discoverDependenciesAdvanced(
                    node.fn,
                    name,
                    this.options
                );

                this.edges.set(name, result.deps);

                if (result.warnings.length > 0) {
                    this.warnings.push(...result.warnings);
                }

                // Build reverse edges
                for (let dep of result.deps) {
                    if (!this.reverseEdges.has(dep)) {
                        this.reverseEdges.set(dep, new Set());
                    }
                    this.reverseEdges.get(dep).add(name);
                }
            }
        }
    }

    _validate() {
        const visiting = new Set();
        const visited = new Set();

        const visit = (name, path = []) => {
            if (visited.has(name)) return;
            if (visiting.has(name)) {
                throw new Error(`Circular dependency: ${[...path, name].join(' -> ')}`);
            }

            visiting.add(name);
            const deps = this.edges.get(name);
            if (deps) {
                for (let dep of deps) {
                    visit(dep, [...path, name]);
                }
            }
            visiting.delete(name);
            visited.add(name);
        };

        for (let name of this.nodes.keys()) {
            if (this.nodes.get(name).type === 'computed') {
                visit(name);
            }
        }
    }

    _computeExecutionOrder() {
        const visited = new Set();
        const order = [];

        const visit = (name) => {
            if (visited.has(name)) return;
            visited.add(name);

            const deps = this.edges.get(name);
            if (deps) {
                for (let dep of deps) {
                    visit(dep);
                }
            }

            order.push(name);
        };

        for (let name of this.nodes.keys()) {
            if (this.nodes.get(name).type === 'computed') {
                visit(name);
            }
        }

        this.executionOrder = order;
    }

    getDependencies(name) {
        return this.edges.get(name) || new Set();
    }

    getDependents(name) {
        return this.reverseEdges.get(name) || new Set();
    }
}

/**
 * Test/Demo
 */
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('=== Static Analysis Dependency Discovery ===\n');

    const tests = [
        {
            name: 'simple',
            fn: ($) => $.data.length,
            expected: ['data']
        },
        {
            name: 'conditional',
            fn: ($) => $.enabled ? $.data.length : 0,
            expected: ['enabled', 'data']
        },
        {
            name: 'early-return',
            fn: ($) => {
                if (!$.enabled) return 'N/A';
                return $.data.process($.config);
            },
            expected: ['enabled', 'data', 'config']
        },
        {
            name: 'nested',
            fn: ($) => $.a + $.b + ($.c ? $.d : $.e),
            expected: ['a', 'b', 'c', 'd', 'e']
        },
        {
            name: 'bracket-access',
            fn: ($) => $["data"] + $.count,
            expected: ['data', 'count']
        },
        {
            name: 'destructuring',
            fn: ($) => {
                const { x, y } = $;
                return x + y;
            },
            expected: ['x', 'y']
        },
        {
            name: 'dynamic-access',
            fn: ($) => $.data[$.key],
            expected: ['data', 'key'],
            warns: true
        }
    ];

    tests.forEach(test => {
        const result = discoverDependenciesAdvanced(test.fn, test.name, {
            debug: true,
            warnDestructuring: true
        });

        const found = Array.from(result.deps).sort();
        const expected = test.expected.sort();
        const match = JSON.stringify(found) === JSON.stringify(expected);

        console.log(`${test.name}:`);
        console.log(`  Expected: [${expected.join(', ')}]`);
        console.log(`  Found:    [${found.join(', ')}]`);
        console.log(`  ${match ? '✓' : '✗'} ${match ? 'Match!' : 'Mismatch'}`);

        if (result.warnings.length > 0) {
            result.warnings.forEach(w => {
                console.log(`  ⚠ ${w.message}`);
            });
        }

        console.log();
    });

    console.log('=== Build Graph with Static Analysis ===\n');

    const graph = new StaticAnalysisGraph({
        enabled: false,
        data: [1, 2, 3],
        config: { sort: true },
        result: ($) => {
            if (!$.enabled) return 'N/A';
            return $.data.sort($.config);
        }
    }, { debug: true });

    console.log('Graph edges:', Object.fromEntries(
        Array.from(graph.edges.entries()).map(([k, v]) => [k, Array.from(v)])
    ));
    console.log('Execution order:', graph.executionOrder);

    if (graph.warnings.length > 0) {
        console.log('\nWarnings:', graph.warnings);
    }
}
