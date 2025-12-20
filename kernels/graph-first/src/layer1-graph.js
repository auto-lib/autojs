/**
 * LAYER 1: Pure Directed Graph Data Structure
 *
 * Completely generic - no knowledge of Auto.js or reactivity.
 * Could be used for task dependencies, build systems, package managers, etc.
 */

class DirectedGraph {
    constructor() {
        this.nodes = new Map();         // node_id -> metadata
        this.edges = new Map();         // node_id -> Set<node_id> (successors)
        this.reverseEdges = new Map();  // node_id -> Set<node_id> (predecessors)
    }

    /**
     * Add a node to the graph
     */
    addNode(id, metadata = {}) {
        this.nodes.set(id, metadata);
        if (!this.edges.has(id)) {
            this.edges.set(id, new Set());
        }
        if (!this.reverseEdges.has(id)) {
            this.reverseEdges.set(id, new Set());
        }
    }

    /**
     * Remove a node and all edges to/from it
     */
    removeNode(id) {
        this.nodes.delete(id);
        this.edges.delete(id);
        this.reverseEdges.delete(id);

        // Remove edges pointing to/from this node
        for (let [_, targets] of this.edges) {
            targets.delete(id);
        }
        for (let [_, sources] of this.reverseEdges) {
            sources.delete(id);
        }
    }

    /**
     * Add a directed edge from -> to
     */
    addEdge(from, to) {
        // Ensure nodes exist
        if (!this.nodes.has(from)) {
            this.addNode(from);
        }
        if (!this.nodes.has(to)) {
            this.addNode(to);
        }

        // Forward edge: from -> to
        this.edges.get(from).add(to);

        // Reverse edge: to <- from
        this.reverseEdges.get(to).add(from);
    }

    /**
     * Remove an edge
     */
    removeEdge(from, to) {
        this.edges.get(from)?.delete(to);
        this.reverseEdges.get(to)?.delete(from);
    }

    /**
     * Get direct successors of a node (nodes it points to)
     */
    getSuccessors(id) {
        return this.edges.get(id) || new Set();
    }

    /**
     * Get direct predecessors of a node (nodes pointing to it)
     */
    getPredecessors(id) {
        return this.reverseEdges.get(id) || new Set();
    }

    /**
     * Get all nodes reachable from given nodes (following edges forward)
     */
    getReachable(startNodes) {
        const reachable = new Set();
        const queue = [...startNodes];

        while (queue.length > 0) {
            const node = queue.shift();
            const successors = this.getSuccessors(node);

            for (let succ of successors) {
                if (!reachable.has(succ)) {
                    reachable.add(succ);
                    queue.push(succ);
                }
            }
        }

        return reachable;
    }

    /**
     * Get all nodes that can reach given nodes (following edges backward)
     */
    getAncestors(endNodes) {
        const ancestors = new Set();
        const queue = [...endNodes];

        while (queue.length > 0) {
            const node = queue.shift();
            const predecessors = this.getPredecessors(node);

            for (let pred of predecessors) {
                if (!ancestors.has(pred)) {
                    ancestors.add(pred);
                    queue.push(pred);
                }
            }
        }

        return ancestors;
    }

    /**
     * Topological sort - order nodes so dependencies come before dependents
     */
    topologicalSort() {
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();

        const visit = (node) => {
            if (visited.has(node)) return;
            if (visiting.has(node)) {
                throw new Error(`Cycle detected involving: ${node}`);
            }

            visiting.add(node);

            // Visit successors first (dependencies)
            const successors = this.getSuccessors(node);
            for (let succ of successors) {
                visit(succ);
            }

            visiting.delete(node);
            visited.add(node);
            sorted.push(node);
        };

        for (let node of this.nodes.keys()) {
            visit(node);
        }

        return sorted;
    }

    /**
     * Check if graph contains a cycle
     */
    hasCycle() {
        const visited = new Set();
        const visiting = new Set();

        const visit = (node) => {
            if (visited.has(node)) return false;
            if (visiting.has(node)) return true; // Cycle detected!

            visiting.add(node);
            const successors = this.getSuccessors(node);
            for (let succ of successors) {
                if (visit(succ)) return true;
            }
            visiting.delete(node);
            visited.add(node);
            return false;
        };

        for (let node of this.nodes.keys()) {
            if (visit(node)) return true;
        }

        return false;
    }

    /**
     * Get strongly connected components (for cycle analysis)
     */
    getCycles() {
        const cycles = [];
        const visited = new Set();
        const visiting = new Set();
        const path = [];

        const visit = (node) => {
            if (visited.has(node)) return;
            if (visiting.has(node)) {
                // Found a cycle - extract it from path
                const cycleStart = path.indexOf(node);
                const cycle = path.slice(cycleStart);
                cycle.push(node);
                cycles.push(cycle);
                return;
            }

            visiting.add(node);
            path.push(node);

            const successors = this.getSuccessors(node);
            for (let succ of successors) {
                visit(succ);
            }

            path.pop();
            visiting.delete(node);
            visited.add(node);
        };

        for (let node of this.nodes.keys()) {
            visit(node);
        }

        return cycles;
    }

    /**
     * Generate GraphViz DOT format
     */
    toDot(options = {}) {
        let dot = 'digraph G {\n';
        dot += '  rankdir=LR;\n';
        dot += '  node [shape=box];\n\n';

        // Nodes with metadata
        if (options.nodeLabels) {
            for (let [id, metadata] of this.nodes) {
                const label = options.nodeLabels(id, metadata);
                if (label) {
                    dot += `  "${id}" [label="${label}"];\n`;
                }
            }
            dot += '\n';
        }

        // Edges
        for (let [from, targets] of this.edges) {
            for (let to of targets) {
                dot += `  "${from}" -> "${to}";\n`;
            }
        }

        dot += '}\n';
        return dot;
    }

    /**
     * Utilities
     */
    size() {
        return this.nodes.size;
    }

    has(id) {
        return this.nodes.has(id);
    }

    clone() {
        const g = new DirectedGraph();
        for (let [id, metadata] of this.nodes) {
            g.addNode(id, { ...metadata });
        }
        for (let [from, targets] of this.edges) {
            for (let to of targets) {
                g.addEdge(from, to);
            }
        }
        return g;
    }

    /**
     * Debug representation
     */
    toString() {
        return `DirectedGraph(nodes=${this.nodes.size}, edges=${this.countEdges()})`;
    }

    countEdges() {
        let count = 0;
        for (let targets of this.edges.values()) {
            count += targets.size;
        }
        return count;
    }
}

export default DirectedGraph;
