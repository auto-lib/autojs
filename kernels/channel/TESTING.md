# Testing Strategy for Blocks

## Two Levels of Testing

### 1. VM Tests (Internal/Mechanism)
For building and debugging the VM itself. Check internal structures.

### 2. Block Tests (Boundary/Behavior)
For testing blocks and compositions. Check inputs → outputs.

Both can live in the same test format.

---

## Test Format

```js
export default {
    // --- Setup (pick one) ---

    // Single VM (low-level)
    vm: {
        handlers: {
            ping: (v, sig, state) => { state.count = v; }
        }
    },

    // Single Block
    block: {
        needs: ['url'],
        gives: ['host', 'path'],
        host: _ => new URL(_.url).host,
        path: _ => new URL(_.url).pathname
    },

    // Multiple Blocks (auto-wired)
    blocks: [parser, fetcher, renderer],

    // --- Action ---

    fn: (system, global) => {
        // system.sig('ping', 42)           // for vm
        // system.input({ url: '...' })     // for blocks
        // system.step()                    // manual stepping

        // can set global for side-effect checks
        // system.on('out:host', v => global.hostSeen = v)
    },

    // --- Checks (all optional, use what you need) ---

    // Boundary check - what came out?
    output: {
        host: 'example.com',
        path: '/foo'
    },

    // Internal check - what's the VM state?
    _: {
        queue: [],
        state: { url: '...', host: '...' }
    },

    // For multiple blocks, keyed by name:
    _: {
        parser: { queue: [], state: { ... } },
        fetcher: { queue: [], state: { ... } }
    },

    // Global/side-effect check
    global: {
        hostSeen: 'example.com',
        callbackFired: true
    },

    // --- Options ---

    timeout: 100,    // wait before checking (for async)
    ignore: ['queue'] // skip checking certain keys
}
```

---

## Gradual Test Progression

### Phase 1: VM Core (internal tests)

```
tests/vm/
  001_empty_vm.js           - vm exists, empty queue
  002_signal_queued.js      - sig() adds to queue
  003_step_processes.js     - step() removes from queue
  004_handler_called.js     - correct handler runs
  005_handler_state.js      - handler can modify state
  006_handler_emits.js      - handler can sig() new signals
  007_multiple_handlers.js  - dispatch to correct handler
  008_wire_basic.js         - wire connects two vms
  009_wire_fires.js         - signal on A triggers B
```

### Phase 2: Block Syntax (mixed tests)

```
tests/block/
  020_block_compiles.js     - block() creates a vm
  021_needs_gives.js        - needs/gives become handlers
  022_input_stores.js       - in:x stores value
  023_compute_runs.js       - compute triggers on deps
  024_output_emits.js       - out:x emits value
  025_full_block.js         - input → compute → output
```

### Phase 3: Composition (boundary tests)

```
tests/compose/
  040_two_blocks.js         - wire two blocks by name
  041_chain_three.js        - A → B → C
  042_fan_out.js            - A → B, A → C
  043_fan_in.js             - A → C, B → C
  044_compose_fn.js         - compose() creates parent vm
  045_entry_exit.js         - entry/exit routing works
```

### Phase 4: Real Use Cases (boundary tests)

```
tests/apps/
  060_url_parser.js         - parse url to parts
  061_data_fetcher.js       - (mock) fetch from source
  062_full_pipeline.js      - url → parse → fetch → transform → render
```

---

## Example Tests

### 001_empty_vm.js (internal)

```js
export default {
    vm: { handlers: {} },
    fn: (v) => {},
    _: {
        queue: [],
        state: {},
        wires: []
    }
}
```

### 002_signal_queued.js (internal)

```js
export default {
    vm: { handlers: {} },
    fn: (v) => {
        v.sig('ping', 42);
    },
    _: {
        queue: [['ping', 42]]
    }
}
```

### 005_handler_state.js (internal)

```js
export default {
    vm: {
        handlers: {
            set: (v, sig, state) => { state.value = v; }
        }
    },
    fn: (v) => {
        v.sig('set', 123);
        v.step();
    },
    _: {
        queue: [],
        state: { value: 123 }
    }
}
```

### 025_full_block.js (boundary)

```js
export default {
    block: {
        needs: ['url'],
        gives: ['host', 'path'],
        host: _ => new URL(_.url).host,
        path: _ => new URL(_.url).pathname
    },
    fn: (sys) => {
        sys.input({ url: 'https://example.com/foo/bar' });
    },
    output: {
        host: 'example.com',
        path: '/foo/bar'
    }
}
```

### 040_two_blocks.js (boundary)

```js
const parser = {
    needs: ['url'],
    gives: ['host', 'path'],
    host: _ => new URL(_.url).host,
    path: _ => new URL(_.url).pathname
};

const joiner = {
    needs: ['host', 'path'],
    gives: ['endpoint'],
    endpoint: _ => `https://${_.host}${_.path}`
};

export default {
    blocks: [parser, joiner],
    fn: (sys) => {
        sys.input({ url: 'https://api.example.com/v1/data' });
    },
    output: {
        endpoint: 'https://api.example.com/v1/data'
    }
}
```

### With global (side effects)

```js
export default {
    block: {
        needs: ['data'],
        gives: ['count'],
        count: _ => _.data.length
    },
    fn: (sys, global) => {
        sys.on('out:count', v => global.countSeen = v);
        sys.input({ data: [1, 2, 3] });
    },
    output: { count: 3 },
    global: { countSeen: 3 }
}
```

---

## Test Runner Logic

```js
function runTest(test) {
    // 1. Build system
    let system;
    if (test.vm) system = vm(test.vm);
    else if (test.block) system = block(test.block);
    else if (test.blocks) system = wire({ blocks: test.blocks });

    // 2. Run action
    let global = {};
    test.fn(system, global);

    // 3. Check (with optional timeout for async)
    let check = () => {
        let passed = true;

        if (test.output) {
            passed = passed && isEqual(test.output, system.output());
        }

        if (test._) {
            passed = passed && isEqual(test._, system._(), test.ignore);
        }

        if (test.global) {
            passed = passed && isEqual(test.global, global);
        }

        return passed;
    };

    if (test.timeout) setTimeout(check, test.timeout);
    else check();
}
```

---

## Summary

| Check | What it tests | When to use |
|-------|---------------|-------------|
| `output` | Boundary behavior | Block/compose tests |
| `_` | Internal VM state | VM development, debugging |
| `global` | Side effects | Callbacks, async, subscriptions |

Start with `_` to build the VM. Graduate to `output` for blocks. Use `global` for weird stuff.
