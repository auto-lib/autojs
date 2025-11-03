/**
 * Example: Using the Recorder/Playback system
 *
 * This demonstrates:
 * 1. Recording mode (what you'd run in production)
 * 2. Playback mode (what you'd run on your laptop to test changes)
 */

const auto = require('../auto-commonjs.js');
const { createRecorder, loadRecordings, playback, reportResults } = require('../recorder.cjs');

// ==============================================================================
// PART 1: RECORDING MODE (Production)
// ==============================================================================

function exampleRecording() {
    console.log('=== RECORDING MODE ===\n');

    // Create recorder
    const recorder = createRecorder({
        captureInputs: ['api_response', 'user_filter'],     // What comes from outside
        captureOutputs: ['filtered_data', 'stats', 'display'], // What we want to validate
        maxRecordings: 100,
        shouldRecord: (trace) => {
            // Optional: Only record if certain conditions met
            return trace.triggers.some(t => t.name === 'api_response');
        }
    });

    // Create auto instance with recorder
    const _ = auto({
        // Static - inputs from outside
        api_response: null,
        user_filter: 'all',

        // Dynamic - computed values we want to test
        filtered_data: ($) => {
            if (!$.api_response) return [];
            const data = $.api_response.data || [];
            if ($.user_filter === 'all') return data;
            return data.filter(item => item.status === $.user_filter);
        },

        stats: ($) => {
            const data = $.filtered_data || [];
            return {
                count: data.length,
                avg_value: data.reduce((sum, item) => sum + (item.value || 0), 0) / (data.length || 1)
            };
        },

        display: ($) => {
            return `Showing ${$.stats.count} items (avg: ${$.stats.avg_value.toFixed(2)})`;
        }
    }, {
        trace: (trace) => recorder.record(trace),  // ← This is the magic!
        auto_batch: true
    });

    // Capture initial state
    recorder.captureInitialState(_);

    // Simulate some user interactions (what happens in production)
    console.log('Simulating production usage...\n');

    // API call 1
    _.api_response = {
        data: [
            { id: 1, status: 'active', value: 100 },
            { id: 2, status: 'inactive', value: 50 },
            { id: 3, status: 'active', value: 150 }
        ]
    };

    // User changes filter
    _.user_filter = 'active';

    // API call 2 (updated data)
    _.api_response = {
        data: [
            { id: 1, status: 'active', value: 120 },
            { id: 2, status: 'inactive', value: 60 },
            { id: 3, status: 'active', value: 180 },
            { id: 4, status: 'active', value: 200 }
        ]
    };

    // User changes filter back
    _.user_filter = 'all';

    // Check what was recorded
    console.log('Recorded transactions:', recorder.stats());
    console.log('Sample recording:');
    console.log(JSON.stringify(recorder.getRecordings()[0], null, 2));

    // Save to file
    const filepath = recorder.save('./examples/recordings.json');
    console.log(`\n✅ Recordings saved to ${filepath}`);

    return filepath;
}

// ==============================================================================
// PART 2: PLAYBACK MODE (Local Development)
// ==============================================================================

function examplePlayback(filepath) {
    console.log('\n\n=== PLAYBACK MODE ===\n');

    // Load recordings
    const recordingData = loadRecordings(filepath);
    console.log(`Loaded ${recordingData.recordings.length} recordings from production\n`);

    // Create function that builds a fresh auto instance
    // (This is your current application state setup)
    const createAutoInstance = () => {
        return auto({
            api_response: null,
            user_filter: 'all',

            filtered_data: ($) => {
                if (!$.api_response) return [];
                const data = $.api_response.data || [];
                if ($.user_filter === 'all') return data;
                return data.filter(item => item.status === $.user_filter);
            },

            stats: ($) => {
                const data = $.filtered_data || [];
                return {
                    count: data.length,
                    avg_value: data.reduce((sum, item) => sum + (item.value || 0), 0) / (data.length || 1)
                };
            },

            display: ($) => {
                return `Showing ${$.stats.count} items (avg: ${$.stats.avg_value.toFixed(2)})`;
            }
        }, {
            auto_batch: true
        });
    };

    // Run playback
    const results = playback(recordingData, createAutoInstance, {
        verbose: true
    });

    // Report results
    reportResults(results);

    if (results.failed > 0) {
        console.log('\n⚠️  WARNING: Detected regressions! Your changes broke something.');
        process.exit(1);
    } else {
        console.log('\n✅ All recordings passed! No regressions detected.');
    }
}

// ==============================================================================
// PART 3: PLAYBACK WITH A BREAKING CHANGE
// ==============================================================================

function examplePlaybackWithRegression(filepath) {
    console.log('\n\n=== PLAYBACK WITH BREAKING CHANGE ===\n');

    const recordingData = loadRecordings(filepath);

    // Create auto instance WITH A BUG (changed the computation)
    const createAutoInstance = () => {
        return auto({
            api_response: null,
            user_filter: 'all',

            filtered_data: ($) => {
                if (!$.api_response) return [];
                const data = $.api_response.data || [];
                if ($.user_filter === 'all') return data;
                // BUG: Changed the filter logic!
                return data.filter(item => item.status !== $.user_filter); // ← Wrong!
            },

            stats: ($) => {
                const data = $.filtered_data || [];
                return {
                    count: data.length,
                    avg_value: data.reduce((sum, item) => sum + (item.value || 0), 0) / (data.length || 1)
                };
            },

            display: ($) => {
                return `Showing ${$.stats.count} items (avg: ${$.stats.avg_value.toFixed(2)})`;
            }
        }, {
            auto_batch: true
        });
    };

    const results = playback(recordingData, createAutoInstance, {
        verbose: true
    });

    reportResults(results);
}

// ==============================================================================
// RUN EXAMPLES
// ==============================================================================

if (require.main === module) {
    // Step 1: Record in "production"
    const filepath = exampleRecording();

    // Step 2: Playback with current (working) code
    examplePlayback(filepath);

    // Step 3: Playback with breaking change
    examplePlaybackWithRegression(filepath);
}

module.exports = { exampleRecording, examplePlayback };
