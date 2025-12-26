# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

This repo contains **auto.js**, a small JavaScript reactivity library that enforces “reactivity without side effects”. The core, production implementation lives in the root (`auto-es6.js`, `auto-commonjs.js`, `auto-no-export.js`), and its behavior is specified by an extensive test suite under `tests/`. The `kernels/` directory contains alternative kernel architectures that are intended to satisfy the same test suite.

Key ideas from `README.md`:
- The public API is a single `auto(obj, opt)` function that returns a reactive wrapper.
- Internals are intentionally inspectable via the `_.` property on the returned object (e.g. `console.log($._)`), which exposes `fn`, `deps`, `value`, `subs`, and `fatal`.
- The library is designed to be small, debuggable, and to **reject** side effects inside derived functions (attempting to mutate state from within a reactive function is a fatal error).

If you modify behavior, treat the tests as the canonical specification, not the comments.

## Commands

There are **no npm scripts** defined in `package.json`. Workflows are driven directly via Node.

### Install dependencies

The package has no explicit runtime dependencies, but to work in a standard Node environment:

```bash
npm install
```

### Run the full test suite (also regenerates build artifacts & version)

Tests are driven from `tests/runall.js`. This script does three things:
1. Copies the latest implementation from `docs/devlog/src` into the three root builds: `auto-no-export.js`, `auto-commonjs.js`, and `auto-es6.js`.
2. Runs all tests in `tests/files/` against `auto-es6.js`.
3. Bumps the `version` field in `package.json` based on the devlog file and an MD5 checksum.

Because of these side effects, **running the test suite will modify tracked files**.

```bash
cd tests
node runall.js          # copies devlog → auto-*.js, runs all tests, then updates package.json version
```

### Run a single test

`tests/runall.js` accepts an optional filename (from `tests/files/`) to run just one scenario, which is useful when iterating on behavior.

```bash
cd tests
node runall.js 031_async_function.js       # run only this test file
```

Notes:
- The argument must match the filename in `tests/files/` exactly, including the `.js` extension (e.g. `010_circle_detection.js`).
- The runner automatically calls `$.flush()` (if available) at the end of each test to make auto-batching deterministic.

### Kernel exploration / signal-based kernel tests

The `kernels/channel` directory contains a working prototype of a **signal-based** kernel that has its own minimal runner.

```bash
cd kernels/channel
node run.js              # runs the channel kernel demo / debug scenario
```

`kernels/channel/tests/` mirrors a subset of the main `tests/files/` suite for this kernel; see `kernels/channel/README.md` for the current status and expectations.

> There is no configured linter or typechecker in this repo; if you add ESLint/TypeScript/etc., wire them into `package.json` as needed.

## Tests as specification

Tests under `tests/files/` are the **contract** for auto.js. Each test file exports a structure like:

- `obj`: the initial state passed to `auto(obj, opt)`.
- `fn($, global)`: a function that performs reads/writes on the reactive wrapper and optional global side checks.
- `_`: the expected internal state snapshot (`{ fn, deps, value, subs, fatal, ... }`) after `fn` runs.
- `global` (optional): expected shape of an auxiliary object used to confirm subscription effects.

`tests/runall.js`:
- Imports `../auto-es6.js` dynamically.
- For each test file under `tests/files/` (names starting with a numeric prefix), creates a reactive instance, runs `fn`, flushes auto-batch (if needed), and then compares `$_` and `global` against the expected values using a custom deep equality.
- Maintains an `ignored` list for tests that are temporarily disabled.

When changing behavior in `auto-es6.js` or designing a new kernel, you should:
- Add or adapt tests in `tests/files/` that describe the desired behavior.
- Run `node runall.js` (or a single targeted test) to confirm internals still match the spec.

## Core runtime architecture (current production kernel)

The production kernel is implemented in `auto-es6.js` as a single `auto(obj, opt)` function with the following structure:

- **Internal state maps/sets**
  - `fn`: mapping from reactive variable name → function implementing its computation.
  - `value`: current concrete values for all variables (static and computed).
  - `deps`: for each computed variable, the set of variables it depends on.
  - `dependents`: inverse dependency graph (who depends on whom) used for propagation.
  - `subs`: subscription registry, mapping variable → subscription tags → callbacks.
  - `fatal`: structured fatal error information (`msg`, `stack`, captured `vars`).
  - Additional tracking structures for async, auto-batching, tracing, and access control (e.g. static vs dynamic, internal vs external).

- **Public surface of the returned object**
  - `res._`: internal view used by tests and debugging; at minimum includes `{ fn, deps, value, subs, fatal }`.
  - `res['#']`: low-level helpers used by `add_*` APIs (and potentially by tests/experimental code).
  - Instance methods:
    - `add_static`, `add_dynamic`: attach new static/dynamic variables to an existing instance.
    - `add_static_external/internal/mixed`, `add_dynamic_external/internal/mixed`: categorize variables into external/internal/mixed partitions for access checks.
    - `flush()`: forces pending auto-batch triggers to propagate immediately.
    - `batch(fn)`: groups multiple external `set`s into a single propagation transaction.

- **Setup phase**
  - `wrap(res, hash, obj)` inspects each entry of `obj`:
    - Non-functions are treated as **static values**: a property is defined on the result with a getter (and setter) that reads/writes the internal `value` via `getter`/`setter`.
    - Functions are treated as **dynamic/derived values**: a proxy argument `_` is created that allows reads via `getter` and deliberately fails on writes (enforcing no side effects), and `fn[name]` becomes the wrapped computation.
  - A `#fatal` handler is installed (either user-provided or a default implementation) to handle fatal propagation errors.
  - `run_tests(obj)` optionally executes small internal tests supplied via the `opt.tests` option.
  - Finally, all dynamic functions are eagerly `update`d once to seed initial values.

- **Propagation pipeline**

  Propagation of changes is organized into explicit phases, which are important both for readability and for the change-detection features tested by the suite:

  1. **Invalidate** (`phase1_invalidate`) – Starting from a trigger variable, recursively walk `dependents` to find all computed variables that are potentially affected; collect them into a set.
  2. **Topological sort** (`phase2_topological_sort`) – Perform a DFS-based topo sort over the affected set to ensure dependencies compute before dependents; logs structural circularity when it encounters cycles.
  3. **Capture old values** (`phase3_capture_old_values`) – Snapshot previous values for all affected variables for change detection.
  4. **Clear values** (`phase4_clear_values`) – Delete entries in `value` for affected computed variables so they will be recomputed.
  5. **Recompute** (`phase5_recompute`) – Call `update(name, txn_id)` in topo order for all affected dynamic variables.
  6. **Detect changes** (`phase6_detect_changes`) – Compare old vs new values (with special handling for objects) to determine which variables *actually* changed.
  7. **Build trace** (`phase7_build_trace`) – Build a transaction trace object (`trace`) capturing triggers, updates, and timestamps; optionally passed to a user-supplied `trace` callback.
  8. **Notify subscriptions** (`phase8_notify_subscriptions`) – Invoke subscription callbacks for each variable that actually changed.

  `propagate(triggers)` orchestrates these phases for one or more triggers. External writes go through `setter`, which either:
  - Schedules an auto-batch (default), collecting triggers and later calling `propagate` on the batched set, or
  - Immediately calls `propagate` when auto-batching is disabled.

- **Side-effect and access constraints**
  - Dynamic functions receive a proxy `_` that:
    - Reads route through `getter`, which records dependencies in `deps`/`dependents` and enforces access rules (e.g. internal vs external variables).
    - Writes always call `fail` – this is how “no side effects in reactive functions” is enforced.
  - External reads of internal-only functions/variables and cross-boundary violations (e.g. a function reading a banned external static variable) are converted into `fatal` errors, which tests assert on.

Understanding and preserving this structure is critical: the tests assert on the shape and contents of `res._`, not just on observable outputs.

## Kernel experiments (`kernels/`)

`kernels/README.md` documents several alternative kernel architectures that are intended to satisfy the same behavioral contract as the production kernel while splitting out a minimal “frozen” core and pluggable features:

- **Signal-based kernel (`kernels/channel`)**
  - Core primitive: a message/queue system where operations are “signals” processed by handlers.
  - Distinguishes **delayed** (queued) and **immediate** (synchronous) signal handlers.
  - Core queue/dispatcher lives in `signal.js`; auto-specific behavior is implemented as signal handlers in `auto.js`.
  - Goal: features like async, batching, circular detection, and subscriptions become composable handlers rather than inline logic.

- **Hook-based kernel (`kernels/hooks`) – proposed**
  - Core primitive: a tiny kernel exposes explicit hook points (e.g. `before_set`, `after_compute`, `before_propagate`).
  - Features (async, batching, circular detection, subscriptions, tracing) are plugins that register callbacks for these hooks.

- **Middleware-based kernel (`kernels/middleware`) – proposed**
  - Core primitive: middleware pipeline (inspired by Express/Koa) where each operation (`set`, `get`, `propagate`, `compute`) flows through a chain of middleware.
  - Features are middleware that can observe, transform, or short-circuit operations.

- **Graph-based kernel (`kernels/graph`) – proposed**
  - Core primitive: separates the dependency graph (pure data structure) from executors (behavior: immediate, batched, lazy, async).
  - Same graph can be run by different executors; enables experimentation with execution strategies without altering dependency structure.

Other directories described in `kernels/README.md` (actors, streams, constraints, events) are ideas for further exploration.

When working on kernels under `kernels/`:
- Treat `tests/files/` as the canonical spec: new kernels should eventually run (or mirror) that suite.
- Keep the “minimal core + pluggable features” design goal in mind; avoid reintroducing monolithic propagation logic.
