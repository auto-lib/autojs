// Test: Basic recorder functionality

const { createRecorder, playback } = require('../../recorder.js');

let recordings = [];
let recorder_trace_count = 0;

export default {
    obj: {
        input: 0,
        doubled: ($) => $.input * 2,
        tripled: ($) => $.input * 3,
        '#fatal': () => {}
    },
    fn: ($, global) => {
        // Create recorder
        const recorder = createRecorder({
            captureInputs: ['input'],
            captureOutputs: ['doubled', 'tripled']
        });

        // Setup auto instance with recorder
        const trace_fn = (trace) => {
            recorder.record(trace);
            recorder_trace_count++;
        };

        // Note: In this test, we're using the already-created $ instance
        // In real usage, you'd pass recorder.record to auto() options
        // This test validates the recorder logic itself

        // Capture initial state
        recorder.captureInitialState($);

        // Simulate some changes
        $.input = 5;
        $.flush();

        $.input = 10;
        $.flush();

        // Check recordings
        recordings = recorder.getRecordings();

        global.recording_count = recordings.length;
        global.first_input = recordings[0].inputs[0].value;
        global.first_doubled = recordings[0].outputs.doubled;
        global.first_tripled = recordings[0].outputs.tripled;

        global.second_input = recordings[1].inputs[0].value;
        global.second_doubled = recordings[1].outputs.doubled;
        global.second_tripled = recordings[1].outputs.tripled;

        // Test playback
        const createAutoInstance = () => {
            const auto = require('../../auto-commonjs.js');
            return auto({
                input: 0,
                doubled: ($) => $.input * 2,
                tripled: ($) => $.input * 3
            }, { auto_batch: true });
        };

        const recordingData = {
            initial_state: { input: 0 },
            recordings: recordings
        };

        const results = playback(recordingData, createAutoInstance);

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
