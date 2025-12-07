/**
 * KERNEL - The Execution Model
 *
 * Pure "intent -> policy -> action"
 * Doesn't know about reactivity - just about timing and execution.
 */

function kernel(opt = {}) {
    let queue = [];
    let drainScheduled = false;

    // Configuration
    let policy = opt.policy || 'deferred';  // 'immediate' | 'deferred'
    let drainDelay = opt.drainDelay || 0;

    // The action: what "executing" means (provided by consumer)
    let execute = opt.execute || ((name, value) => {
        console.log('no executor configured for', name, value);
    });

    /**
     * Receive an intent - the entry point
     * An intent is just [name, value]
     */
    function receive(name, value) {
        let intent = { name, value };

        if (policy === 'immediate') {
            execute(name, value);
        }
        else if (policy === 'deferred') {
            queue.push(intent);
            scheduleDrain();
        }
    }

    /**
     * Schedule the queue to drain (if not already scheduled)
     */
    function scheduleDrain() {
        if (drainScheduled) return;
        drainScheduled = true;
        setTimeout(drain, drainDelay);
    }

    /**
     * Drain the queue - execute all pending intents
     */
    function drain() {
        drainScheduled = false;
        let batch = queue;
        queue = [];
        for (let intent of batch) {
            execute(intent.name, intent.value);
        }
    }

    /**
     * Flush - drain immediately, cancel any scheduled drain
     */
    function flush() {
        if (drainScheduled) {
            drainScheduled = false;
            // Note: can't actually cancel setTimeout, but we clear the queue
        }
        drain();
    }

    /**
     * Step - process exactly one intent from the queue
     * Returns true if there was something to process
     */
    function step() {
        if (queue.length === 0) return false;
        let intent = queue.shift();
        execute(intent.name, intent.value);
        return true;
    }

    /**
     * Check if there are pending intents
     */
    function pending() {
        return queue.length > 0;
    }

    return {
        receive,
        flush,
        step,
        pending,
        _: { queue }
    };
}

export { kernel };
