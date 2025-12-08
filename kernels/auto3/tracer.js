/**
 * TRACER - Records and diffs execution traces
 *
 * Uses the kernel's transform system to observe all intents
 * without modifying core behavior.
 *
 * Three levels of diffing:
 *   1. Data diff - what values changed
 *   2. Flow diff - what execution path was taken
 *   3. Code diff - what handlers changed (via hashing)
 */

/**
 * Simple hash function for strings
 * (In production, use crypto.subtle or a proper hash lib)
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;  // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Hash a handler (function or { policy, handler } object)
 */
function hashHandler(handler) {
    if (typeof handler === 'function') {
        return simpleHash(handler.toString());
    }
    if (handler && handler.handler) {
        return simpleHash(JSON.stringify({
            policy: handler.policy,
            code: handler.handler.toString()
        }));
    }
    return simpleHash(JSON.stringify(handler));
}

/**
 * Hash all handlers in a handlers object
 */
function hashHandlers(handlers) {
    let hashes = {};
    for (let [name, handler] of Object.entries(handlers)) {
        hashes[name] = hashHandler(handler);
    }
    return hashes;
}

/**
 * Create a tracer that records intents via transform
 */
function createTracer(options = {}) {
    let runs = [];          // completed runs
    let currentRun = null;  // run in progress
    let runCounter = 0;

    /**
     * Start a new run (call before triggering changes)
     */
    function startRun(metadata = {}) {
        runCounter++;
        currentRun = {
            id: `run-${runCounter}`,
            timestamp: Date.now(),
            metadata,
            intents: [],
            snapshots: [],      // state snapshots at key points
            handlerHashes: {},  // populated on end
        };
        return currentRun.id;
    }

    /**
     * End the current run
     */
    function endRun(finalState = {}, handlers = {}) {
        if (!currentRun) return null;

        currentRun.endTimestamp = Date.now();
        currentRun.duration = currentRun.endTimestamp - currentRun.timestamp;
        currentRun.finalState = { ...finalState };
        currentRun.handlerHashes = hashHandlers(handlers);

        runs.push(currentRun);
        let completed = currentRun;
        currentRun = null;
        return completed;
    }

    /**
     * The transform function - plug this into kernel
     */
    function transform(intent, state, sig) {
        if (!currentRun) return intent;  // not recording

        // Record the intent
        currentRun.intents.push({
            timestamp: Date.now(),
            name: intent.name,
            value: JSON.parse(JSON.stringify(intent.value)),  // deep clone
        });

        // Optionally snapshot state
        if (options.snapshotOnIntent) {
            currentRun.snapshots.push({
                timestamp: Date.now(),
                afterIntent: intent.name,
                state: JSON.parse(JSON.stringify(state.cache || {}))
            });
        }

        return intent;  // pass through unchanged
    }

    /**
     * Get all recorded runs
     */
    function getRuns() {
        return runs;
    }

    /**
     * Get a specific run by id
     */
    function getRun(id) {
        return runs.find(r => r.id === id);
    }

    /**
     * Clear all recorded runs
     */
    function clear() {
        runs = [];
        currentRun = null;
    }

    /**
     * Diff two runs - data level
     * What values are different in final state?
     */
    function diffData(runId1, runId2) {
        let run1 = getRun(runId1);
        let run2 = getRun(runId2);
        if (!run1 || !run2) return null;

        let state1 = run1.finalState || {};
        let state2 = run2.finalState || {};

        let allKeys = new Set([...Object.keys(state1), ...Object.keys(state2)]);
        let diff = {
            changed: [],
            added: [],
            removed: [],
            unchanged: []
        };

        for (let key of allKeys) {
            let in1 = key in state1;
            let in2 = key in state2;
            let val1 = JSON.stringify(state1[key]);
            let val2 = JSON.stringify(state2[key]);

            if (!in1 && in2) {
                diff.added.push({ key, value: state2[key] });
            } else if (in1 && !in2) {
                diff.removed.push({ key, value: state1[key] });
            } else if (val1 !== val2) {
                diff.changed.push({ key, from: state1[key], to: state2[key] });
            } else {
                diff.unchanged.push(key);
            }
        }

        return diff;
    }

    /**
     * Diff two runs - flow level
     * What intents were different?
     */
    function diffFlow(runId1, runId2) {
        let run1 = getRun(runId1);
        let run2 = getRun(runId2);
        if (!run1 || !run2) return null;

        let intents1 = run1.intents.map(i => `${i.name}:${JSON.stringify(i.value)}`);
        let intents2 = run2.intents.map(i => `${i.name}:${JSON.stringify(i.value)}`);

        // Simple diff - which intents appear in one but not other
        let set1 = new Set(intents1);
        let set2 = new Set(intents2);

        let onlyIn1 = intents1.filter(i => !set2.has(i));
        let onlyIn2 = intents2.filter(i => !set1.has(i));
        let inBoth = intents1.filter(i => set2.has(i));

        // Sequence comparison
        let sequenceMatch = intents1.length === intents2.length &&
            intents1.every((intent, i) => intent === intents2[i]);

        return {
            sequenceMatch,
            run1IntentCount: intents1.length,
            run2IntentCount: intents2.length,
            onlyInRun1: onlyIn1.map(parseIntentString),
            onlyInRun2: onlyIn2.map(parseIntentString),
            inBoth: inBoth.length
        };
    }

    /**
     * Diff two runs - code level
     * What handlers changed?
     */
    function diffCode(runId1, runId2) {
        let run1 = getRun(runId1);
        let run2 = getRun(runId2);
        if (!run1 || !run2) return null;

        let hashes1 = run1.handlerHashes || {};
        let hashes2 = run2.handlerHashes || {};

        let allHandlers = new Set([...Object.keys(hashes1), ...Object.keys(hashes2)]);
        let diff = {
            changed: [],
            added: [],
            removed: [],
            unchanged: []
        };

        for (let name of allHandlers) {
            let in1 = name in hashes1;
            let in2 = name in hashes2;

            if (!in1 && in2) {
                diff.added.push({ name, hash: hashes2[name] });
            } else if (in1 && !in2) {
                diff.removed.push({ name, hash: hashes1[name] });
            } else if (hashes1[name] !== hashes2[name]) {
                diff.changed.push({ name, from: hashes1[name], to: hashes2[name] });
            } else {
                diff.unchanged.push(name);
            }
        }

        return diff;
    }

    /**
     * Full diff - all three levels
     */
    function diff(runId1, runId2) {
        return {
            data: diffData(runId1, runId2),
            flow: diffFlow(runId1, runId2),
            code: diffCode(runId1, runId2)
        };
    }

    /**
     * Get a summary of a run
     */
    function summarize(runId) {
        let run = getRun(runId);
        if (!run) return null;

        // Count intents by name
        let intentCounts = {};
        for (let intent of run.intents) {
            intentCounts[intent.name] = (intentCounts[intent.name] || 0) + 1;
        }

        return {
            id: run.id,
            timestamp: run.timestamp,
            duration: run.duration,
            totalIntents: run.intents.length,
            intentCounts,
            finalStateKeys: Object.keys(run.finalState || {}),
            metadata: run.metadata
        };
    }

    return {
        // Recording
        transform,
        startRun,
        endRun,

        // Access
        getRuns,
        getRun,
        clear,

        // Diffing
        diffData,
        diffFlow,
        diffCode,
        diff,

        // Utilities
        summarize,
        hashHandler,
        hashHandlers
    };
}

/**
 * Helper to parse "name:value" string back to object
 */
function parseIntentString(str) {
    let colonIndex = str.indexOf(':');
    return {
        name: str.substring(0, colonIndex),
        value: JSON.parse(str.substring(colonIndex + 1))
    };
}

/**
 * Create a traced version of a kernel
 * Automatically injects tracer transform
 */
function tracedKernel(kernelFactory, tracer) {
    return (config = {}) => {
        let transforms = config.transforms || [];
        transforms.unshift(tracer.transform);  // tracer goes first
        return kernelFactory({ ...config, transforms });
    };
}

export { createTracer, tracedKernel, hashHandler, hashHandlers, simpleHash };
