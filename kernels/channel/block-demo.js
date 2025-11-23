// block-demo.js - See the signals flow

// ============================================
// THE VM - just a signal processor with logging
// ============================================

function vm(name, handlers = {}) {
    let state = {}
    let queue = []
    let wires = []  // outgoing connections

    function sig(signal, value) {
        queue.push([signal, value])
    }

    function step() {
        if (queue.length === 0) return false
        let [signal, value] = queue.shift()

        // Log the signal
        let display = value
        if (typeof value === 'object') display = JSON.stringify(value)
        console.log(`  [${name}] ${signal.padEnd(15)} ${display ?? ''}`)

        // Run handler if exists
        if (signal in handlers) {
            handlers[signal](value, sig, state)
        }

        // Check wires for outgoing signals
        for (let w of wires) {
            if (w.from === signal) {
                console.log(`  [wire] ${name}.${w.from} --> ${w.target.name}.${w.to}`)
                w.target.sig(w.to, value)
            }
        }

        return true
    }

    function run() {
        let steps = 0
        while (step() && steps < 100) steps++
        return steps
    }

    function connect(fromSignal, targetVm, toSignal) {
        wires.push({ from: fromSignal, target: targetVm, to: toSignal })
    }

    return { name, sig, step, run, state, connect, _queue: queue }
}

// ============================================
// DEMO 1: Single block, see signals
// ============================================

console.log('='.repeat(50))
console.log('DEMO 1: Single block')
console.log('='.repeat(50))
console.log()

const parse_url = vm('parse_url', {
    'in:url': (v, sig, state) => {
        state.url = v
        sig('compute:source')
        sig('compute:params')
    },
    'compute:source': (_, sig, state) => {
        state.source = state.url.split('?')[0]
        sig('out:source', state.source)
    },
    'compute:params': (_, sig, state) => {
        state.params = state.url.split('?')[1] || ''
        sig('out:params', state.params)
    }
})

console.log('Setting url to "http://api.com/data?limit=10"...')
console.log()
parse_url.sig('in:url', 'http://api.com/data?limit=10')
parse_url.run()

console.log()
console.log('Final state:', parse_url.state)
console.log()

// ============================================
// DEMO 2: Two blocks wired together
// ============================================

console.log('='.repeat(50))
console.log('DEMO 2: Two blocks wired together')
console.log('='.repeat(50))
console.log()

const parser = vm('parser', {
    'in:url': (v, sig, state) => {
        state.url = v
        sig('compute')
    },
    'compute': (_, sig, state) => {
        state.host = new URL(state.url).host
        state.path = new URL(state.url).pathname
        sig('out:host', state.host)
        sig('out:path', state.path)
    }
})

const fetcher = vm('fetcher', {
    'in:host': (v, sig, state) => {
        state.host = v
        sig('check')
    },
    'in:path': (v, sig, state) => {
        state.path = v
        sig('check')
    },
    'check': (_, sig, state) => {
        if (state.host && state.path) {
            sig('compute')
        }
    },
    'compute': (_, sig, state) => {
        state.endpoint = `https://${state.host}${state.path}`
        sig('out:endpoint', state.endpoint)
    }
})

// Wire them together
parser.connect('out:host', fetcher, 'in:host')
parser.connect('out:path', fetcher, 'in:path')

console.log('Wiring: parser.out:host --> fetcher.in:host')
console.log('Wiring: parser.out:path --> fetcher.in:path')
console.log()
console.log('Setting url to "https://example.com/api/users"...')
console.log()

parser.sig('in:url', 'https://example.com/api/users')

// Run both VMs until done
let activity = true
while (activity) {
    activity = parser.step() || fetcher.step()
}

console.log()
console.log('Parser state:', parser.state)
console.log('Fetcher state:', fetcher.state)
console.log()

// ============================================
// DEMO 3: The block() helper - nicer syntax
// ============================================

console.log('='.repeat(50))
console.log('DEMO 3: block() helper syntax')
console.log('='.repeat(50))
console.log()

function block(name, config) {
    // Convert nice config to handlers
    let handlers = {}

    // For each input, create a handler that stores and triggers computes
    for (let inp of (config.needs || [])) {
        handlers[`in:${inp}`] = (v, sig, state) => {
            state[inp] = v
            // Trigger all compute functions
            for (let out of (config.gives || [])) {
                sig(`compute:${out}`)
            }
        }
    }

    // For each output, create compute handler
    for (let out of (config.gives || [])) {
        if (config[out]) {
            handlers[`compute:${out}`] = (_, sig, state) => {
                // Build the _ proxy for accessing state
                let result = config[out](state)
                state[out] = result
                sig(`out:${out}`, result)
            }
        }
    }

    return vm(name, handlers)
}

// Now define blocks with nicer syntax
const urlParser = block('urlParser', {
    needs: ['url'],
    gives: ['host', 'path'],
    host: _ => new URL(_.url).host,
    path: _ => new URL(_.url).pathname
})

const endpointBuilder = block('endpointBuilder', {
    needs: ['host', 'path'],
    gives: ['endpoint'],
    endpoint: _ => `https://${_.host}${_.path}/blerg`
})

// Wire
urlParser.connect('out:host', endpointBuilder, 'in:host')
urlParser.connect('out:path', endpointBuilder, 'in:path')

console.log('Blocks defined with block() helper')
console.log('Wired: urlParser --> endpointBuilder')
console.log()
console.log('Setting url...')
console.log()

urlParser.sig('in:url', 'https://api.example.com/v2/users')

// Run all
activity = true
while (activity) {
    activity = urlParser.step() || endpointBuilder.step()
}

console.log()
console.log('urlParser state:', urlParser.state)
console.log('endpointBuilder state:', endpointBuilder.state)
