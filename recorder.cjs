/**
 * Recorder/Playback system for auto.js
 *
 * RECORDING MODE (in production):
 *   Captures transaction traces to detect what inputs led to what outputs
 *
 * PLAYBACK MODE (on laptop):
 *   Replays recorded inputs and compares outputs to detect regressions
 */

const fs = require('fs');
const path = require('path');

/**
 * Create a recorder instance
 *
 * @param {Object} options
 * @param {string[]} options.captureInputs - Variable names to capture as inputs (triggers)
 * @param {string[]} options.captureOutputs - Variable names to capture as outputs (for regression testing)
 * @param {number} [options.maxRecordings=1000] - Maximum recordings to keep in memory
 * @param {boolean} [options.captureInitialState=true] - Capture initial state of all variables
 * @param {function} [options.shouldRecord] - Optional filter: (trace) => boolean
 * @returns {Recorder}
 */
function createRecorder(options) {
    const {
        captureInputs,
        captureOutputs,
        maxRecordings = 1000,
        captureInitialState = true,
        shouldRecord = () => true
    } = options;

    const recordings = [];
    let session_id = generateSessionId();
    let recording_counter = 0;
    let initial_state = null;

    const recorder = {
        /**
         * Record a transaction trace
         * This is the function you pass to auto() options: { trace: recorder.record }
         */
        record(trace) {
            // Filter by user's shouldRecord function
            if (!shouldRecord(trace)) return;

            // Only record if involves captured inputs
            const relevantTriggers = trace.triggers.filter(t =>
                captureInputs.includes(t.name)
            );

            if (relevantTriggers.length === 0) return;

            // Build recording
            const recording = {
                id: `${session_id}_${recording_counter++}`,
                timestamp: trace.timestamp,

                // Inputs (what changed from outside)
                inputs: relevantTriggers.map(t => ({
                    name: t.name,
                    value: cloneValue(t.value)
                })),

                // Outputs (computed values we want to validate)
                outputs: {},

                // Full trace for debugging
                trace: {
                    id: trace.id,
                    allTriggers: trace.triggers.map(t => t.name),
                    allUpdates: Object.keys(trace.updates)
                }
            };

            // Capture outputs we care about
            captureOutputs.forEach(name => {
                if (name in trace.updates) {
                    recording.outputs[name] = cloneValue(trace.updates[name]);
                }
            });

            // Add to recordings
            recordings.push(recording);

            // Trim if too many
            if (recordings.length > maxRecordings) {
                recordings.shift();
            }
        },

        /**
         * Capture initial state (call once after auto() setup)
         */
        captureInitialState(autoInstance) {
            if (!captureInitialState) return;

            initial_state = {};

            // Capture inputs
            captureInputs.forEach(name => {
                if (name in autoInstance._.value) {
                    initial_state[name] = cloneValue(autoInstance._.value[name]);
                }
            });

            // Capture outputs
            captureOutputs.forEach(name => {
                if (name in autoInstance._.value) {
                    initial_state[name] = cloneValue(autoInstance._.value[name]);
                }
            });
        },

        /**
         * Get current recordings
         */
        getRecordings() {
            return recordings;
        },

        /**
         * Save recordings to file
         */
        save(filepath) {
            const data = {
                session_id,
                recorded_at: new Date().toISOString(),
                initial_state,
                recordings,
                metadata: {
                    captureInputs,
                    captureOutputs,
                    count: recordings.length
                }
            };

            fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
            return filepath;
        },

        /**
         * Clear all recordings
         */
        clear() {
            recordings.length = 0;
            recording_counter = 0;
            session_id = generateSessionId();
        },

        /**
         * Get summary statistics
         */
        stats() {
            return {
                session_id,
                recording_count: recordings.length,
                captured_inputs: captureInputs,
                captured_outputs: captureOutputs,
                initial_state: initial_state ? 'captured' : 'not captured'
            };
        }
    };

    return recorder;
}

/**
 * Load recordings from file
 *
 * @param {string} filepath - Path to recordings file
 * @returns {Object} - Loaded recording data
 */
function loadRecordings(filepath) {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    return data;
}

/**
 * Playback engine - replays recorded inputs and compares outputs
 *
 * @param {Object} recordingData - Data from loadRecordings()
 * @param {function} createAutoInstance - Function that creates a fresh auto() instance
 * @param {Object} [options]
 * @param {boolean} [options.verbose=false] - Log each playback
 * @param {function} [options.comparator] - Custom comparison: (expected, actual, name) => diff|null
 * @returns {PlaybackResult}
 */
function playback(recordingData, createAutoInstance, options = {}) {
    const {
        verbose = false,
        comparator = defaultComparator
    } = options;

    const results = {
        total: recordingData.recordings.length,
        passed: 0,
        failed: 0,
        failures: []
    };

    // For each recording
    recordingData.recordings.forEach((recording, index) => {
        if (verbose) {
            console.log(`\nPlayback ${index + 1}/${results.total}: ${recording.id}`);
        }

        // Create fresh auto() instance
        const _ = createAutoInstance();

        // Apply initial state if available
        if (recordingData.initial_state) {
            Object.keys(recordingData.initial_state).forEach(name => {
                if (name in _._.value && typeof _[name] !== 'function') {
                    _[name] = cloneValue(recordingData.initial_state[name]);
                }
            });
        }

        // Flush any auto-batch
        if (_.flush) _.flush();

        // Replay inputs
        recording.inputs.forEach(input => {
            if (verbose) {
                console.log(`  Set ${input.name} =`, input.value);
            }
            _[input.name] = cloneValue(input.value);
        });

        // Flush to ensure all updates complete
        if (_.flush) _.flush();

        // Compare outputs
        const diffs = {};
        let hasDiff = false;

        Object.keys(recording.outputs).forEach(name => {
            const expected = recording.outputs[name];
            const actual = _._.value[name];

            const diff = comparator(expected, actual, name);
            if (diff) {
                diffs[name] = diff;
                hasDiff = true;
            }
        });

        if (hasDiff) {
            results.failed++;
            results.failures.push({
                recording_id: recording.id,
                timestamp: recording.timestamp,
                inputs: recording.inputs,
                diffs: diffs
            });

            if (verbose) {
                console.log('  ❌ REGRESSION DETECTED:');
                Object.keys(diffs).forEach(name => {
                    console.log(`    ${name}:`, diffs[name]);
                });
            }
        } else {
            results.passed++;
            if (verbose) {
                console.log('  ✅ PASSED');
            }
        }
    });

    return results;
}

/**
 * Default comparator - uses JSON.stringify for deep comparison
 *
 * @param {*} expected - Expected value from recording
 * @param {*} actual - Actual value from playback
 * @param {string} name - Variable name
 * @returns {Object|null} - Diff object if different, null if same
 */
function defaultComparator(expected, actual, name) {
    const expectedJson = JSON.stringify(expected);
    const actualJson = JSON.stringify(actual);

    if (expectedJson === actualJson) {
        return null;
    }

    return {
        expected,
        actual,
        message: `${name} changed`
    };
}

/**
 * Create a custom comparator with tolerances
 *
 * @param {Object} options
 * @param {string[]} [options.ignoreFields] - Field names to ignore in objects
 * @param {number} [options.numberTolerance] - Tolerance for number comparisons
 * @param {string[]} [options.ignoreVariables] - Variable names to skip comparison
 * @returns {function} - Comparator function
 */
function createComparator(options = {}) {
    const {
        ignoreFields = [],
        numberTolerance = 0,
        ignoreVariables = []
    } = options;

    return (expected, actual, name) => {
        // Skip ignored variables
        if (ignoreVariables.includes(name)) return null;

        // Strip ignored fields
        if (typeof expected === 'object' && expected !== null) {
            expected = stripFields(expected, ignoreFields);
            actual = stripFields(actual, ignoreFields);
        }

        // Number tolerance
        if (typeof expected === 'number' && typeof actual === 'number') {
            if (Math.abs(expected - actual) <= numberTolerance) {
                return null;
            }
        }

        // Use default comparison
        return defaultComparator(expected, actual, name);
    };
}

// Helper functions

function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function cloneValue(val) {
    // Deep clone using JSON (good enough for most cases)
    // For complex objects (with functions, etc), might need custom logic
    try {
        return JSON.parse(JSON.stringify(val));
    } catch (e) {
        // If can't JSON serialize, just return undefined
        return undefined;
    }
}

function stripFields(obj, fields) {
    if (Array.isArray(obj)) {
        return obj.map(item => stripFields(item, fields));
    } else if (typeof obj === 'object' && obj !== null) {
        const result = {};
        Object.keys(obj).forEach(key => {
            if (!fields.includes(key)) {
                result[key] = stripFields(obj[key], fields);
            }
        });
        return result;
    }
    return obj;
}

/**
 * Report playback results in human-readable format
 */
function reportResults(results) {
    console.log('\n=== PLAYBACK RESULTS ===');
    console.log(`Total: ${results.total}`);
    console.log(`Passed: ${results.passed} ✅`);
    console.log(`Failed: ${results.failed} ❌`);

    if (results.failed > 0) {
        console.log('\n=== FAILURES ===');
        results.failures.forEach((failure, i) => {
            console.log(`\n${i + 1}. Recording: ${failure.recording_id}`);
            console.log(`   Timestamp: ${new Date(failure.timestamp).toISOString()}`);
            console.log(`   Inputs:`);
            failure.inputs.forEach(input => {
                console.log(`     ${input.name} = ${JSON.stringify(input.value)}`);
            });
            console.log(`   Diffs:`);
            Object.keys(failure.diffs).forEach(name => {
                const diff = failure.diffs[name];
                console.log(`     ${name}:`);
                console.log(`       Expected: ${JSON.stringify(diff.expected)}`);
                console.log(`       Actual:   ${JSON.stringify(diff.actual)}`);
            });
        });
    }
}

module.exports = {
    createRecorder,
    loadRecordings,
    playback,
    createComparator,
    reportResults
};
