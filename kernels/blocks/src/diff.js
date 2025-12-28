/**
 * DIFF - Multi-Level Diffing Infrastructure
 *
 * Provides diffing at multiple levels:
 * - Value diff: primitive value changes
 * - Object diff: added/removed/changed keys
 * - Array diff: element changes
 * - Graph diff: node/edge changes
 * - Block diff: which blocks changed
 *
 * Key insight: Diffs are hierarchical - a chart diff contains
 * data diffs, which contain object diffs, which contain value diffs.
 */

/**
 * Deep equality check
 */
function deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }

    if (Array.isArray(a) || Array.isArray(b)) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (let key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
}

/**
 * Diff primitive values
 */
function diffValue(before, after) {
    if (before === after) {
        return { type: 'unchanged', before, after };
    }
    return { type: 'changed', before, after };
}

/**
 * Diff objects - find added/removed/changed keys
 */
function diffObject(before, after) {
    if (before === after) {
        return { type: 'unchanged', before, after };
    }

    if (typeof before !== 'object' || typeof after !== 'object') {
        return diffValue(before, after);
    }

    if (before === null || after === null) {
        return diffValue(before, after);
    }

    const keysBefore = Object.keys(before);
    const keysAfter = Object.keys(after);

    const added = {};
    const removed = {};
    const changed = {};
    const unchanged = {};

    // Check for removed keys
    for (let key of keysBefore) {
        if (!keysAfter.includes(key)) {
            removed[key] = before[key];
        }
    }

    // Check for added and changed keys
    for (let key of keysAfter) {
        if (!keysBefore.includes(key)) {
            added[key] = after[key];
        } else if (!deepEqual(before[key], after[key])) {
            changed[key] = {
                before: before[key],
                after: after[key],
                diff: diff(before[key], after[key])  // Recursive diff
            };
        } else {
            unchanged[key] = after[key];
        }
    }

    const hasChanges = Object.keys(added).length > 0 ||
                       Object.keys(removed).length > 0 ||
                       Object.keys(changed).length > 0;

    return {
        type: hasChanges ? 'changed' : 'unchanged',
        added,
        removed,
        changed,
        unchanged,
        before,
        after
    };
}

/**
 * Diff arrays - find added/removed/changed elements
 */
function diffArray(before, after) {
    if (before === after) {
        return { type: 'unchanged', before, after };
    }

    if (!Array.isArray(before) || !Array.isArray(after)) {
        return diffValue(before, after);
    }

    const changes = [];
    const maxLen = Math.max(before.length, after.length);

    for (let i = 0; i < maxLen; i++) {
        if (i >= before.length) {
            changes.push({ index: i, type: 'added', value: after[i] });
        } else if (i >= after.length) {
            changes.push({ index: i, type: 'removed', value: before[i] });
        } else if (!deepEqual(before[i], after[i])) {
            changes.push({
                index: i,
                type: 'changed',
                before: before[i],
                after: after[i],
                diff: diff(before[i], after[i])
            });
        }
    }

    return {
        type: changes.length > 0 ? 'changed' : 'unchanged',
        lengthBefore: before.length,
        lengthAfter: after.length,
        changes,
        before,
        after
    };
}

/**
 * Generic diff - dispatches to appropriate diff function
 */
function diff(before, after) {
    if (before === after) {
        return { type: 'unchanged', before, after };
    }

    if (Array.isArray(before) && Array.isArray(after)) {
        return diffArray(before, after);
    }

    if (typeof before === 'object' && typeof after === 'object' &&
        before !== null && after !== null) {
        return diffObject(before, after);
    }

    return diffValue(before, after);
}

/**
 * Diff graphs - find added/removed/changed nodes and edges
 */
function diffGraph(graphBefore, graphAfter) {
    const addedNodes = new Set();
    const removedNodes = new Set();
    const unchangedNodes = new Set();

    // Find added and unchanged nodes
    for (let node of graphAfter.nodes.keys()) {
        if (!graphBefore.has(node)) {
            addedNodes.add(node);
        } else {
            unchangedNodes.add(node);
        }
    }

    // Find removed nodes
    for (let node of graphBefore.nodes.keys()) {
        if (!graphAfter.has(node)) {
            removedNodes.add(node);
        }
    }

    const addedEdges = [];
    const removedEdges = [];

    // Find added edges (only for nodes that exist in both graphs)
    for (let from of graphAfter.nodes.keys()) {
        if (removedNodes.has(from)) continue;
        const successorsAfter = graphAfter.getSuccessors(from);
        const successorsBefore = graphBefore.has(from) ? graphBefore.getSuccessors(from) : new Set();

        for (let to of successorsAfter) {
            if (!successorsBefore.has(to) && !removedNodes.has(to)) {
                addedEdges.push({ from, to });
            }
        }
    }

    // Find removed edges (only for nodes that exist in both graphs)
    for (let from of graphBefore.nodes.keys()) {
        if (removedNodes.has(from)) continue;
        const successorsBefore = graphBefore.getSuccessors(from);
        const successorsAfter = graphAfter.has(from) ? graphAfter.getSuccessors(from) : new Set();

        for (let to of successorsBefore) {
            if (!successorsAfter.has(to) && !removedNodes.has(to)) {
                removedEdges.push({ from, to });
            }
        }
    }

    const hasChanges = addedNodes.size > 0 ||
                       removedNodes.size > 0 ||
                       addedEdges.length > 0 ||
                       removedEdges.length > 0;

    return {
        type: hasChanges ? 'changed' : 'unchanged',
        nodes: {
            added: Array.from(addedNodes),
            removed: Array.from(removedNodes),
            unchanged: Array.from(unchangedNodes)
        },
        edges: {
            added: addedEdges,
            removed: removedEdges
        },
        before: graphBefore,
        after: graphAfter
    };
}

/**
 * Diff block states - find which blocks changed
 */
function diffBlocks(blocksBefore, blocksAfter) {
    const changes = {};
    const allBlockNames = new Set([
        ...blocksBefore.map(b => b.name),
        ...blocksAfter.map(b => b.name)
    ]);

    for (let name of allBlockNames) {
        const before = blocksBefore.find(b => b.name === name);
        const after = blocksAfter.find(b => b.name === name);

        if (!before) {
            changes[name] = { type: 'added', block: after };
        } else if (!after) {
            changes[name] = { type: 'removed', block: before };
        } else {
            // Compare block states
            const stateDiff = diffObject(before._.state.cache, after._.state.cache);
            if (stateDiff.type === 'changed') {
                changes[name] = {
                    type: 'changed',
                    before,
                    after,
                    stateDiff
                };
            }
        }
    }

    const hasChanges = Object.keys(changes).length > 0;

    return {
        type: hasChanges ? 'changed' : 'unchanged',
        changes,
        blocksBefore,
        blocksAfter
    };
}

/**
 * Format diff for human-readable output
 */
function formatDiff(diff, indent = 0) {
    const spaces = '  '.repeat(indent);

    if (diff.type === 'unchanged') {
        return `${spaces}(unchanged)`;
    }

    if (diff.type === 'changed' && 'before' in diff && 'after' in diff && !('added' in diff)) {
        // Simple value change
        return `${spaces}${JSON.stringify(diff.before)} → ${JSON.stringify(diff.after)}`;
    }

    if ('added' in diff || 'removed' in diff || 'changed' in diff) {
        // Object diff
        let output = [];

        if (Object.keys(diff.added || {}).length > 0) {
            output.push(`${spaces}Added:`);
            for (let [key, value] of Object.entries(diff.added)) {
                output.push(`${spaces}  + ${key}: ${JSON.stringify(value)}`);
            }
        }

        if (Object.keys(diff.removed || {}).length > 0) {
            output.push(`${spaces}Removed:`);
            for (let [key, value] of Object.entries(diff.removed)) {
                output.push(`${spaces}  - ${key}: ${JSON.stringify(value)}`);
            }
        }

        if (Object.keys(diff.changed || {}).length > 0) {
            output.push(`${spaces}Changed:`);
            for (let [key, change] of Object.entries(diff.changed)) {
                output.push(`${spaces}  ${key}:`);
                output.push(formatDiff(change.diff, indent + 2));
            }
        }

        return output.join('\n');
    }

    if ('changes' in diff && Array.isArray(diff.changes)) {
        // Array diff
        let output = [`${spaces}Array changes (${diff.lengthBefore} → ${diff.lengthAfter}):`];
        for (let change of diff.changes) {
            if (change.type === 'added') {
                output.push(`${spaces}  [${change.index}] + ${JSON.stringify(change.value)}`);
            } else if (change.type === 'removed') {
                output.push(`${spaces}  [${change.index}] - ${JSON.stringify(change.value)}`);
            } else if (change.type === 'changed') {
                output.push(`${spaces}  [${change.index}]:`);
                output.push(formatDiff(change.diff, indent + 2));
            }
        }
        return output.join('\n');
    }

    return `${spaces}${JSON.stringify(diff)}`;
}

export {
    diff,
    diffValue,
    diffObject,
    diffArray,
    diffGraph,
    diffBlocks,
    formatDiff,
    deepEqual
};
