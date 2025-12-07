# Deferred Execution and the Atoms of Execution

A discussion on first principles of execution, leading to a rewrite of the auto reactivity library.

## Starting Point: What is a Function Call?

We start by running a function:

```js
x(1234)
```

What if we wrap it in an object?

```js
b.x(1234)
```

Now we've captured the name in code. What if to run the function we pass in the name too:

```js
b.sig('x', 1234);
```

This reduces a function call to its essence: **a name and a value**. Everything else is ceremony we can control ourselves.

## Separating Intent from Action

When you go from:

```js
x(1234)  // immediate execution
```

to:

```js
queue.push(['x', 1234])  // deferred execution
```

You've created a **gap between intent and action**. That gap is where all the power lives.

### What the Gap Gives You

1. **Inspection** - look at what's about to happen before it happens
2. **Reordering** - change the order of execution
3. **Batching** - group operations together
4. **Cancellation** - decide not to execute something
5. **Replay** - run the same sequence again
6. **Serialization** - send the intent somewhere else
7. **Interception** - transform or redirect operations

## Two Separations

There are actually two distinct separations:

1. **Intent from Action**: `sig('x', 1234)` - named the call, made it inspectable, but still executes now
2. **Now from Later**: the queue - decoupled *when* from *what*

These are orthogonal. You can have either without the other.

## The Fundamental Questions of Execution

| Question | Meaning |
|----------|---------|
| **What** | The name and value - the intent |
| **When** | Now, later, never, conditionally |
| **Where** | Here, elsewhere, distributed |

## What Can You Do With an Intent?

Once you have `[name, value]` as data, your choices are:

| Policy | Description |
|--------|-------------|
| **Immediate** | Execute now |
| **Defer** | Put it somewhere for later (queue) |
| **Dispatch** | Send it somewhere else (another block, worker, network) |
| **Drop** | Ignore it |
| **Transform** | Change it into something else |
| **Route** | Dynamically choose which policy based on the intent |

## The Drain Policy

Any deferred execution has a trigger - under what conditions does intent become action?

- Queue: what drains it?
- Promise: what resolves it?
- Observable: what emits?

The policy for draining is where interesting behavior emerges.

## A Possible Formalism

```
Intent = [name, value]

Policy =
    | Immediate
    | Defer(queue)
    | Dispatch(target)
    | Drop
    | Transform(f, Policy)
    | Route(f: Intent -> Policy)

Block = Route  // a block IS a routing function
```

A Block receives intents and applies policies. Composition happens via Dispatch - blocks holding references to other blocks.

## Connecting to Reactivity

In a reactive system like `auto`:

- **Intent**: `{ name, value }` - a state change request
- **Immediate**: `auto_batch_enabled = false`, propagate runs now
- **Defer**: `auto_batch_pending` queue
- **Drain trigger**: setTimeout OR getter forces flush
- **Transform**: computed functions `($) => ...`
- **Drop**: fatal errors stop propagation

The `propagate` function IS the action - the 8 phases of invalidation, recomputation, and notification.

## The Rewrite Approach

Separate concerns into layers:

### Layer 1: Kernel (Execution Model)

Pure "intent -> policy -> action". Knows about:
- Receiving intents
- Queuing (deferred execution)
- Draining (when to execute)
- Does NOT know about reactivity

### Layer 2: Graph (Reactive Dependencies)

Pure dependency tracking. Knows about:
- Values and computed functions
- Dependency tracking during computation
- Invalidation propagation
- Does NOT know about timing/queues

### Layer 3: Auto (Public API)

Wires kernel + graph together:
- Maps nice `$.x = y` API onto kernel + graph
- Flushes on read for consistency
- Handles subscriptions

## The Key Insight

The kernel doesn't know about reactivity. The graph doesn't know about timing. They compose.

This separation lets us:
- Reason about execution independently from reactivity
- Swap execution strategies without touching reactive logic
- Eventually compose multiple reactive graphs via dispatch
