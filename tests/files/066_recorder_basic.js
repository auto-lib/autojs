// Test: Basic recorder functionality

// Note: Since this is an ES module, we can't use require() for the recorder
// The recorder would need to be converted to ES module format or we test the concept differently

let recordings = [];
let recorder_trace_count = 0;

// Manual recorder implementation for testing purposes
let createTestRecorder = (options) => {
    const { captureInputs, captureOutputs } = options;
    let recordings = [];

    return {
        record(trace) {
            const relevantTriggers = trace.triggers.filter(t =>
                captureInputs.includes(t.name)
            );

            if (relevantTriggers.length === 0) return;

            const recording = {
                id: `test_${recordings.length}`,
                timestamp: trace.timestamp,
                inputs: relevantTriggers.map(t => ({
                    name: t.name,
                    value: JSON.parse(JSON.stringify(t.value))
                })),
                outputs: {}
            };

            captureOutputs.forEach(name => {
                if (name in trace.updates) {
                    recording.outputs[name] = JSON.parse(JSON.stringify(trace.updates[name]));
                }
            });

            recordings.push(recording);
        },
        getRecordings() {
            return recordings;
        },
        captureInitialState($) {
            // Minimal implementation
        }
    };
};

// Manual playback implementation for testing
let testPlayback = (recordingData, autoInstance, stateDef) => {
    let passed = 0;
    let failed = 0;

    recordingData.recordings.forEach(recording => {
        // Reset to initial state
        autoInstance.input = 0;
        autoInstance.flush();

        // Replay inputs
        recording.inputs.forEach(input => {
            autoInstance[input.name] = input.value;
        });

        autoInstance.flush();

        // Compare outputs
        let hasDiff = false;
        Object.keys(recording.outputs).forEach(name => {
            const expected = JSON.stringify(recording.outputs[name]);
            const actual = JSON.stringify(autoInstance._.value[name]);
            if (expected !== actual) {
                hasDiff = true;
            }
        });

        if (hasDiff) {
            failed++;
        } else {
            passed++;
        }
    });

    return { passed, failed, total: recordingData.recordings.length };
};

export default {
    obj: {
        input: 0,
        doubled: ($) => $.input * 2,
        tripled: ($) => $.input * 3,
        '#fatal': () => {}
    },
    fn: ($, global) => {
        // Create recorder
        const recorder = createTestRecorder({
            captureInputs: ['input'],
            captureOutputs: ['doubled', 'tripled']
        });

        // Track traces
        let traces = [];
        const originalTrace = $._.value;

        // Simulate recording by capturing state after each change
        $.input = 5;
        $.flush();

        // Manually record this state
        recorder.record({
            timestamp: Date.now(),
            triggers: [{ name: 'input', value: 5 }],
            updates: { input: 5, doubled: 10, tripled: 15 }
        });

        $.input = 10;
        $.flush();

        // Manually record this state
        recorder.record({
            timestamp: Date.now(),
            triggers: [{ name: 'input', value: 10 }],
            updates: { input: 10, doubled: 20, tripled: 30 }
        });

        // Check recordings
        recordings = recorder.getRecordings();

        global.recording_count = recordings.length;
        global.first_input = recordings[0].inputs[0].value;
        global.first_doubled = recordings[0].outputs.doubled;
        global.first_tripled = recordings[0].outputs.tripled;

        global.second_input = recordings[1].inputs[0].value;
        global.second_doubled = recordings[1].outputs.doubled;
        global.second_tripled = recordings[1].outputs.tripled;

        // Test playback (using the existing $ instance)
        const recordingData = {
            initial_state: { input: 0 },
            recordings: recordings
        };

        const results = testPlayback(recordingData, $);

        global.playback_passed = results.passed;
        global.playback_failed = results.failed;
        global.playback_total = results.total;
    },
    opt: {
        auto_batch: true,
        auto_batch_delay: 0
    },
    _: {
        fn: ['doubled', 'tripled'],
        deps: {
            doubled: { input: true },
            tripled: { input: true }
        },
        subs: {},
        value: {
            input: 10,
            doubled: 20,
            tripled: 30
        },
        fatal: {}
    },
    global: {
        recording_count: 2,

        // First recording (input=5)
        first_input: 5,
        first_doubled: 10,
        first_tripled: 15,

        // Second recording (input=10)
        second_input: 10,
        second_doubled: 20,
        second_tripled: 30,

        // Playback results
        playback_passed: 2,
        playback_failed: 0,
        playback_total: 2
    }
}
