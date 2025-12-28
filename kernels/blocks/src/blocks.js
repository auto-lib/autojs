/**
 * Module 3: Blocks
 *
 * Combines Block definition and Cross-Block wiring.
 * - Block: Grouping of related functions with optional inputs/outputs
 * - Wiring: Explicit connections between blocks
 * - Cross-Block Graph: Unified graph spanning multiple blocks
 */

import DirectedGraph from './directed-graph.js';
import { buildGraph } from './static-analysis.js';

/**
 * Block - a named group of related reactive functions
 */
export class Block {
    constructor(config) {
        this.name = config.name;
        this.inputs = config.inputs || [];    // Optional - external inputs
        this.outputs = config.outputs || [];  // Optional - exported outputs
        this.functions = config.functions;    // Object of { varName: valueOrFunction }

        // Build internal graph
        this.graph = buildGraph(this.functions);

        // Validate inputs/outputs if declared
        if (this.inputs.length > 0) {
            this._validateInputs();
        }
        if (this.outputs.length > 0) {
            this._validateOutputs();
        }
    }

    _validateInputs() {
        for (let input of this.inputs) {
            if (!(input in this.functions)) {
                throw new Error(
                    `Block '${this.name}': declared input '${input}' not found in functions`
                );
            }
        }
    }

    _validateOutputs() {
        for (let output of this.outputs) {
            if (!(output in this.functions)) {
                throw new Error(
                    `Block '${this.name}': declared output '${output}' not found in functions`
                );
            }
        }
    }

    /**
     * Get variable names in this block
     */
    getVariables() {
        return Object.keys(this.functions);
    }

    /**
     * Check if block has a variable
     */
    has(varName) {
        return varName in this.functions;
    }
}

/**
 * Wire - connection between blocks
 * Simple tuple: [fromBlock.variable, toBlock.variable]
 */
export class Wire {
    constructor(fromBlock, fromVar, toBlock, toVar) {
        this.fromBlock = fromBlock;
        this.fromVar = fromVar;
        this.toBlock = toBlock;
        this.toVar = toVar;
    }

    toString() {
        return `${this.fromBlock}.${this.fromVar} -> ${this.toBlock}.${this.toVar}`;
    }
}

/**
 * Create a wire (helper function)
 */
export function wire(fromBlock, fromVar, toBlock, toVar) {
    return new Wire(fromBlock, fromVar, toBlock, toVar);
}

/**
 * Auto-wire blocks by matching output names to input names
 */
export function autoWire(blocks) {
    const wires = [];
    const blocksByName = new Map(blocks.map(b => [b.name, b]));

    for (let block of blocks) {
        // For each declared input
        for (let input of block.inputs) {
            // Find a block that exports this name
            for (let [sourceName, sourceBlock] of blocksByName) {
                if (sourceName === block.name) continue; // Skip self

                // Check if source block exports this variable
                if (sourceBlock.outputs.includes(input)) {
                    wires.push(new Wire(sourceName, input, block.name, input));
                    break; // Take first match
                }
            }
        }
    }

    return wires;
}

/**
 * Build a unified cross-block graph
 *
 * @param {Block[]} blocks - Array of blocks
 * @param {Wire[]} wires - Array of wires connecting blocks
 * @returns {DirectedGraph} - Unified graph with namespaced nodes
 */
export function buildCrossBlockGraph(blocks, wires = []) {
    const graph = new DirectedGraph();
    const blocksByName = new Map(blocks.map(b => [b.name, b]));

    // Add all nodes from all blocks (namespaced as "blockName.varName")
    for (let block of blocks) {
        for (let varName of Object.keys(block.functions)) {
            const fullName = `${block.name}.${varName}`;
            const value = block.functions[varName];
            const isFunction = typeof value === 'function';

            graph.addNode(fullName, {
                block: block.name,
                variable: varName,
                type: isFunction ? 'computed' : 'static'
            });
        }
    }

    // Add internal edges (within each block)
    for (let block of blocks) {
        for (let [from, targets] of block.graph.edges) {
            for (let to of targets) {
                const fullFrom = `${block.name}.${from}`;
                const fullTo = `${block.name}.${to}`;
                graph.addEdge(fullFrom, fullTo);
            }
        }
    }

    // Add cross-block edges (from wiring)
    for (let w of wires) {
        const fullFrom = `${w.fromBlock}.${w.fromVar}`;
        const fullTo = `${w.toBlock}.${w.toVar}`;

        // Validate wire
        const fromBlock = blocksByName.get(w.fromBlock);
        const toBlock = blocksByName.get(w.toBlock);

        if (!fromBlock) {
            throw new Error(`Wire references unknown block: ${w.fromBlock}`);
        }
        if (!toBlock) {
            throw new Error(`Wire references unknown block: ${w.toBlock}`);
        }
        if (!fromBlock.has(w.fromVar)) {
            throw new Error(
                `Wire references unknown variable: ${w.fromBlock}.${w.fromVar}`
            );
        }
        if (!toBlock.has(w.toVar)) {
            throw new Error(
                `Wire references unknown variable: ${w.toBlock}.${w.toVar}`
            );
        }

        graph.addEdge(fullFrom, fullTo);
    }

    return graph;
}

/**
 * Analyze cross-block graph to find cross-block edges
 */
export function getCrossBlockEdges(graph) {
    const crossBlock = [];

    for (let [from, targets] of graph.edges) {
        const fromBlock = from.split('.')[0];

        for (let to of targets) {
            const toBlock = to.split('.')[0];

            if (fromBlock !== toBlock) {
                crossBlock.push({ from, to });
            }
        }
    }

    return crossBlock;
}

/**
 * Get all blocks affected by a variable change
 */
export function getAffectedBlocks(graph, blockName, varName) {
    const fullName = `${blockName}.${varName}`;
    const affected = graph.getReachable([fullName]);
    const blocks = new Set();

    for (let node of affected) {
        const block = node.split('.')[0];
        if (block !== blockName) {
            blocks.add(block);
        }
    }

    return Array.from(blocks);
}

/**
 * Trace a change through the graph
 */
export function traceChange(graph, blockName, varName) {
    const fullName = `${blockName}.${varName}`;
    const affected = graph.getReachable([fullName]);

    const trace = {
        source: fullName,
        affected: Array.from(affected),
        blocks: new Set(),
        variables: new Map()
    };

    for (let node of affected) {
        const [block, variable] = node.split('.');
        trace.blocks.add(block);

        if (!trace.variables.has(block)) {
            trace.variables.set(block, []);
        }
        trace.variables.get(block).push(variable);
    }

    trace.blocks = Array.from(trace.blocks);
    trace.variables = Object.fromEntries(trace.variables);

    return trace;
}

/**
 * Generate GraphViz DOT with block coloring
 */
export function toDotWithBlocks(graph, blocks) {
    const blockColors = [
        '#E3F2FD', // blue
        '#F3E5F5', // purple
        '#E8F5E9', // green
        '#FFF3E0', // orange
        '#FCE4EC', // pink
        '#E0F2F1'  // teal
    ];

    let dot = 'digraph G {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box];\n\n';

    // Group nodes by block
    blocks.forEach((block, idx) => {
        const color = blockColors[idx % blockColors.length];
        dot += `  subgraph cluster_${block.name} {\n`;
        dot += `    label="${block.name}";\n`;
        dot += `    style=filled;\n`;
        dot += `    color="${color}";\n`;

        for (let varName of Object.keys(block.functions)) {
            const fullName = `${block.name}.${varName}`;
            dot += `    "${fullName}" [label="${varName}"];\n`;
        }

        dot += '  }\n\n';
    });

    // Edges
    const crossBlockEdges = getCrossBlockEdges(graph);
    const crossBlockSet = new Set(
        crossBlockEdges.map(e => `${e.from}->${e.to}`)
    );

    for (let [from, targets] of graph.edges) {
        for (let to of targets) {
            const edgeKey = `${from}->${to}`;
            const isCrossBlock = crossBlockSet.has(edgeKey);

            if (isCrossBlock) {
                dot += `  "${from}" -> "${to}" [color=red, penwidth=2.0];\n`;
            } else {
                dot += `  "${from}" -> "${to}";\n`;
            }
        }
    }

    dot += '}\n';
    return dot;
}

/**
 * Combine all functions from all blocks into a single flat object
 * (for passing to Resolver)
 */
export function combineBlockFunctions(blocks, wires = []) {
    const combined = {};
    const wireMap = new Map(); // toFullName -> fromFullName

    // Build wire mapping
    for (let w of wires) {
        const toFullName = `${w.toBlock}.${w.toVar}`;
        const fromFullName = `${w.fromBlock}.${w.fromVar}`;
        wireMap.set(toFullName, fromFullName);
    }

    // Add all functions from all blocks (namespaced)
    for (let block of blocks) {
        for (let [varName, value] of Object.entries(block.functions)) {
            const fullName = `${block.name}.${varName}`;

            // If this variable is wired, create a function that reads from source
            if (wireMap.has(fullName)) {
                const fromFullName = wireMap.get(fullName);
                combined[fullName] = ($) => $[fromFullName];
            } else {
                // Otherwise use the original value/function
                combined[fullName] = value;
            }
        }
    }

    return combined;
}
