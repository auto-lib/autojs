# Blocks: VMs Wired Together

> 23 Nov 2025

## The Core Insight

**A block is a VM. Wiring is just routing signals between VMs.**

That's it. Everything else is sugar.

## The Stack

```
┌─────────────────────────────────────┐
│  block()    nice syntax             │
├─────────────────────────────────────┤
│  vm()       signal processor        │
├─────────────────────────────────────┤
│  signal     queue + dispatch        │
└─────────────────────────────────────┘
```

## What is a VM?

A VM is:
- A **queue** of signals
- **Handlers** that process signals
- **State** that gets modified
- **Wires** to other VMs

```js
function vm(name, handlers) {
    let state = {}
    let queue = []
    let wires = []

    function sig(signal, value) {
        queue.push([signal, value])
    }

    function step() {
        let [signal, value] = queue.shift()
        if (signal in handlers) {
            handlers[signal](value, sig, state)
        }
        for (let w of wires) {
            if (w.from === signal) {
                w.target.sig(w.to, value)
            }
        }
    }

    return { sig, step, state, connect }
}
```

~40 lines. That's the whole runtime.

## What is a Block?

A block is a VM with a nice interface:

```js
const parser = block('parser', {
    needs: ['url'],
    gives: ['host', 'path'],
    host: _ => new URL(_.url).host,
    path: _ => new URL(_.url).pathname
})
```

This compiles to handlers:
- `in:url` → store value, trigger computes
- `compute:host` → run function, emit `out:host`
- `compute:path` → run function, emit `out:path`

## What is Wiring?

Wiring connects one VM's output to another VM's input:

```js
parser.connect('out:host', fetcher, 'in:host')
parser.connect('out:path', fetcher, 'in:path')
```

When `parser` emits `out:host`, it automatically sends `in:host` to `fetcher`.

A wire is just a signal forwarder.

## Signal Flow

```
SET url
    │
    ▼
┌─────────────────────────────────────┐
│  parser VM                          │
│                                     │
│  in:url ──────┬──────────────────── │
│               │                     │
│               ▼                     │
│         compute:host                │
│               │                     │
│               ▼                     │
│          out:host ──────────────────┼───► wire ───┐
│               │                     │             │
│         compute:path                │             │
│               │                     │             │
│               ▼                     │             │
│          out:path ──────────────────┼───► wire ───┼───┐
│                                     │             │   │
└─────────────────────────────────────┘             │   │
                                                    │   │
                ┌───────────────────────────────────┘   │
                │   ┌───────────────────────────────────┘
                ▼   ▼
┌─────────────────────────────────────┐
│  fetcher VM                         │
│                                     │
│  in:host ─────┬───► check           │
│               │       │             │
│  in:path ─────┘       ▼             │
│                   compute           │
│                       │             │
│                       ▼             │
│               out:endpoint          │
│                                     │
└─────────────────────────────────────┘
```

## Composition

A composed block is just a VM that contains other VMs and routes between them:

```js
const app = compose({
    blocks: [parser, fetcher, renderer],
    entry: ['url'],
    exit: ['svg']
})
```

The parent VM:
1. Receives `in:url`
2. Routes to `parser.in:url`
3. Routes `parser.out:*` to `fetcher.in:*`
4. Routes `fetcher.out:*` to `renderer.in:*`
5. Routes `renderer.out:svg` to `out:svg`

It's VMs all the way down.

## Global Namespace Model

Blocks declare what names they need and provide:

```js
const parser = block({
    needs: ['url'],
    gives: ['host', 'path', 'params']
})

const fetcher = block({
    needs: ['host', 'path'],
    gives: ['raw_data']
})

const transformer = block({
    needs: ['raw_data', 'params'],
    gives: ['series']
})
```

Drop them all into a system:

```js
const system = wire({
    blocks: [parser, fetcher, transformer],
    entry: ['url'],
    exit: ['series']
})
```

The system auto-wires by matching names:
- `parser.gives.host` → `fetcher.needs.host`
- `parser.gives.path` → `fetcher.needs.path`
- `parser.gives.params` → `transformer.needs.params`
- `fetcher.gives.raw_data` → `transformer.needs.raw_data`

No explicit wiring needed. Names are the wiring.

## Hashing / Fingerprinting

A block is just data + functions. To hash it:

```js
function hashBlock(block) {
    return md5(JSON.stringify({
        needs: block.needs,
        gives: block.gives,
        fns: Object.entries(block)
            .filter(([k, v]) => typeof v === 'function')
            .map(([k, v]) => [k, v.toString()])
    }))
}
```

If the hash changes, the block's code changed.

## Why This Matters

1. **Traceable** - every signal is logged, you see exactly what happened
2. **Testable** - inject signals, assert on signals
3. **Composable** - blocks are just VMs, compose by wiring
4. **Portable** - signals can route anywhere (local, IPC, WebSocket)
5. **Hashable** - blocks are data, you can fingerprint them

## The Trade Portal Use Case

```js
const url_parser = block({
    needs: ['chart_url'],
    gives: ['source', 'params', 'chart_type']
})

const data_fetcher = block({
    needs: ['source', 'params'],
    gives: ['raw_data']
})

const transformer = block({
    needs: ['raw_data', 'chart_type'],
    gives: ['series']
})

const renderer = block({
    needs: ['series', 'chart_type'],
    gives: ['svg']
})

// The whole chart pipeline
const chart = wire({
    blocks: [url_parser, data_fetcher, transformer, renderer],
    entry: ['chart_url'],
    exit: ['svg']
})

// Change detection
console.log('Block hashes:', {
    url_parser: hashBlock(url_parser),
    data_fetcher: hashBlock(data_fetcher),
    transformer: hashBlock(transformer),
    renderer: hashBlock(renderer)
})

// If any hash changed, that block's code changed
// Re-run tests for that block
```

## Summary

| Concept | What it is |
|---------|------------|
| Signal | A message: `{ name, value }` |
| VM | Queue + handlers + state |
| Block | VM with nice `needs`/`gives` syntax |
| Wire | Signal forwarder between VMs |
| Compose | VM containing VMs |
| Hash | Fingerprint of block's code |

**Block = VM. Wire = Signal Route. That's the whole model.**
