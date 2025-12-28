/**
 * CROSS-BLOCK GRAPH - Unified Dependency Graph Across Blocks
 *
 * Builds a unified dependency graph from multiple blocks.
 * Each block has its own internal dependency graph, plus
 * cross-block dependencies created by wiring.
 *
 * Key insight: The full system graph is the union of:
 * 1. Internal block graphs (variable dependencies within each block)
 * 2. Cross-block edges (wires between blocks)
 */

import DirectedGraph from './directed-graph.js';

/**
 * Build a unified graph from multiple blocks
 */
function buildCrossBlockGraph(blocks) {
    const graph = new DirectedGraph();

    // 1. Add all nodes from all blocks
    for (let block of blocks) {
        const state = block._.state;

        // Add nodes for all variables in this block
        for (let varName of Object.keys(state.cache)) {
            const nodeId = `${block.name}.${varName}`;
            graph.addNode(nodeId, {
                block: block.name,
                variable: varName,
                value: state.cache[varName],
                isFunction: varName in state.fns
            });
        }
    }

    // 2. Add internal block edges (dependencies within each block)
    for (let block of blocks) {
        const state = block._.state;

        // For each computed variable, add edges from its dependencies
        for (let [varName, deps] of Object.entries(state.deps)) {
            const targetNode = `${block.name}.${varName}`;

            for (let depName of Object.keys(deps)) {
                const sourceNode = `${block.name}.${depName}`;
                graph.addEdge(sourceNode, targetNode);
            }
        }
    }

    // 3. Add cross-block edges (wires between blocks)
    for (let block of blocks) {
        const state = block._.state;

        if (state.wires) {
            for (let wire of state.wires) {
                const sourceNode = `${block.name}.${wire.from}`;
                const targetNode = `${wire.targetBlock.name}.${wire.to}`;

                graph.addEdge(sourceNode, targetNode);
            }
        }
    }

    return graph;
}

/**
 * Get the subgraph for a specific block
 */
function getBlockSubgraph(crossBlockGraph, blockName) {
    const subgraph = new DirectedGraph();

    // Add nodes from this block
    for (let [nodeId, metadata] of crossBlockGraph.nodes) {
        if (metadata.block === blockName) {
            subgraph.addNode(nodeId, metadata);
        }
    }

    // Add edges within this block
    for (let [from, targets] of crossBlockGraph.edges) {
        const fromMeta = crossBlockGraph.nodes.get(from);
        if (fromMeta && fromMeta.block === blockName) {
            for (let to of targets) {
                const toMeta = crossBlockGraph.nodes.get(to);
                if (toMeta && toMeta.block === blockName) {
                    subgraph.addEdge(from, to);
                }
            }
        }
    }

    return subgraph;
}

/**
 * Get all cross-block edges (edges that cross block boundaries)
 */
function getCrossBlockEdges(crossBlockGraph) {
    const crossEdges = [];

    for (let [from, targets] of crossBlockGraph.edges) {
        const fromMeta = crossBlockGraph.nodes.get(from);

        for (let to of targets) {
            const toMeta = crossBlockGraph.nodes.get(to);

            if (fromMeta && toMeta && fromMeta.block !== toMeta.block) {
                crossEdges.push({
                    from,
                    to,
                    fromBlock: fromMeta.block,
                    toBlock: toMeta.block,
                    fromVar: fromMeta.variable,
                    toVar: toMeta.variable
                });
            }
        }
    }

    return crossEdges;
}

/**
 * Find which blocks a variable affects (transitive closure)
 */
function getAffectedBlocks(crossBlockGraph, blockName, varName) {
    const startNode = `${blockName}.${varName}`;
    const affectedBlocks = new Set();

    const reachable = crossBlockGraph.getReachable([startNode]);

    for (let nodeId of reachable) {
        const metadata = crossBlockGraph.nodes.get(nodeId);
        if (metadata && metadata.block !== blockName) {
            affectedBlocks.add(metadata.block);
        }
    }

    return Array.from(affectedBlocks);
}

/**
 * Find which blocks affect a variable (reverse transitive closure)
 */
function getAffectingBlocks(crossBlockGraph, blockName, varName) {
    const endNode = `${blockName}.${varName}`;
    const affectingBlocks = new Set();

    const ancestors = crossBlockGraph.getAncestors([endNode]);

    for (let nodeId of ancestors) {
        const metadata = crossBlockGraph.nodes.get(nodeId);
        if (metadata && metadata.block !== blockName) {
            affectingBlocks.add(metadata.block);
        }
    }

    return Array.from(affectingBlocks);
}

/**
 * Trace a change through the graph
 * Returns the path from source to all affected variables
 */
function traceChange(crossBlockGraph, blockName, varName) {
    const startNode = `${blockName}.${varName}`;
    const paths = [];

    const reachable = crossBlockGraph.getReachable([startNode]);

    for (let nodeId of reachable) {
        const metadata = crossBlockGraph.nodes.get(nodeId);
        paths.push({
            node: nodeId,
            block: metadata.block,
            variable: metadata.variable,
            crossesBlock: metadata.block !== blockName
        });
    }

    return {
        source: { block: blockName, variable: varName },
        affected: paths,
        blocksAffected: Array.from(new Set(paths.map(p => p.block)))
    };
}

/**
 * Analyze graph for debugging insights
 */
function analyzeGraph(crossBlockGraph, blocks) {
    const blockNames = blocks.map(b => b.name);

    const analysis = {
        totalNodes: crossBlockGraph.nodes.size,
        totalEdges: crossBlockGraph.countEdges(),
        blocks: {},
        crossBlockEdges: getCrossBlockEdges(crossBlockGraph),
        hasCycles: crossBlockGraph.hasCycle()
    };

    // Per-block analysis
    for (let blockName of blockNames) {
        const subgraph = getBlockSubgraph(crossBlockGraph, blockName);
        const block = blocks.find(b => b.name === blockName);

        analysis.blocks[blockName] = {
            nodes: subgraph.nodes.size,
            internalEdges: subgraph.countEdges(),
            inputs: block.needs,
            outputs: block.gives,
            hasInternalCycles: subgraph.hasCycle()
        };
    }

    // Cross-block connectivity
    analysis.crossBlockConnectivity = {};
    for (let edge of analysis.crossBlockEdges) {
        const key = `${edge.fromBlock} → ${edge.toBlock}`;
        if (!analysis.crossBlockConnectivity[key]) {
            analysis.crossBlockConnectivity[key] = [];
        }
        analysis.crossBlockConnectivity[key].push({
            from: edge.fromVar,
            to: edge.toVar
        });
    }

    return analysis;
}

/**
 * Generate GraphViz DOT with block clustering
 */
function toDotWithBlocks(crossBlockGraph, blocks) {
    let dot = 'digraph G {\n';
    dot += '  rankdir=LR;\n';
    dot += '  compound=true;\n\n';

    // Create subgraphs for each block
    for (let block of blocks) {
        dot += `  subgraph cluster_${block.name} {\n`;
        dot += `    label="${block.name}";\n`;
        dot += `    style=filled;\n`;
        dot += `    color=lightgrey;\n\n`;

        // Nodes in this block
        for (let [nodeId, metadata] of crossBlockGraph.nodes) {
            if (metadata.block === block.name) {
                const shape = metadata.isFunction ? 'ellipse' : 'box';
                dot += `    "${nodeId}" [label="${metadata.variable}", shape=${shape}];\n`;
            }
        }

        dot += '  }\n\n';
    }

    // Edges
    for (let [from, targets] of crossBlockGraph.edges) {
        for (let to of targets) {
            const fromMeta = crossBlockGraph.nodes.get(from);
            const toMeta = crossBlockGraph.nodes.get(to);

            // Cross-block edges in bold
            if (fromMeta && toMeta && fromMeta.block !== toMeta.block) {
                dot += `  "${from}" -> "${to}" [style=bold, color=red];\n`;
            } else {
                dot += `  "${from}" -> "${to}";\n`;
            }
        }
    }

    dot += '}\n';
    return dot;
}

export {
    buildCrossBlockGraph,
    getBlockSubgraph,
    getCrossBlockEdges,
    getAffectedBlocks,
    getAffectingBlocks,
    traceChange,
    analyzeGraph,
    toDotWithBlocks
};
