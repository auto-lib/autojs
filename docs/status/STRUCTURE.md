# Documentation Structure

**Created**: 2025-12-26
**Last Updated**: 2025-12-26

This document describes the organization of the auto.js documentation.

## Overview

The documentation is organized by **audience** and **purpose**:

```
/docs/
├── user/              # For people USING auto.js
├── concepts/          # Understanding reactivity & philosophy
├── development/       # For maintainers & contributors
├── experiments/       # Research, exploration, analysis
└── status/            # Project tracking & status
```

---

## 📘 USER (For Library Users)

**Location**: `/docs/user/`

Documentation for developers using auto.js in their projects.

| File | Description |
|------|-------------|
| `getting-started.md` | Introduction and first steps with auto.js |
| `api-reference.md` | Complete API syntax reference |
| `tutorial.md` | Step-by-step guide to building reactive objects |
| `advanced-features.md` | Special functions, subscriptions, batching |
| `html-integration.md` | Using auto.js with HTML/DOM |
| `installation.md` | NPM installation and Node.js usage |

**Start here**: `getting-started.md`

---

## 🧠 CONCEPTS (Understanding Reactivity)

**Location**: `/docs/concepts/`

Conceptual explanations of reactivity and auto.js philosophy.

| File | Description |
|------|-------------|
| `what-is-reactivity.md` | Core concept explanation |
| `why-reactivity-matters.md` | Vision, impact, game-changing aspects |
| `how-auto-works.md` | Architectural insights and observations |
| `async-behavior.md` | Asynchronous reactivity analysis |
| `advanced-patterns.md` | Map chains and complex patterns |

**Philosophy**: Reactivity without side effects - functions READ state but never WRITE state.

---

## 🔧 DEVELOPMENT (For Maintainers)

**Location**: `/docs/development/`

Technical implementation documentation for contributors and maintainers.

| File | Description |
|------|-------------|
| `architecture.md` | Complete system architecture documentation |
| `internals.md` | Internal implementation details |
| `recorder.md` | Record/playback system documentation |
| `refactoring.md` | Refactoring notes and comparisons |
| `tracing.md` | Transaction tracing and explainability |
| `warp.md` | WARP system documentation |
| `todo.md` | Development task tracking |
| `devlog/` | **Source of truth** - 54 numbered versions |

### Devlog Structure

The devlog is the **single source of truth** for the production library:

```
/docs/development/devlog/
├── readme.md           # Explains devlog workflow
├── src/                # 54 numbered versions (001-054)
│   └── 054_circular_reference_protection.js  (latest)
└── doc/                # Supplementary notes for specific versions
```

**Important**: Never edit `auto-es6.js` directly. Changes are made by:
1. Copy latest devlog file (e.g., `054_*.js`) to new numbered file (e.g., `055_*.js`)
2. Make changes in new file
3. Run `cd tests && node runall.js` to generate distribution files

---

## 🧪 EXPERIMENTS (Research & Exploration)

**Location**: `/docs/experiments/`

Research, ideas, analysis, and historical artifacts.

### Ideas
**Location**: `/docs/experiments/ideas/`

Future features and experimental concepts:
- `dom-as-state.md` - Experimental DOM-as-state concept
- `readme.md` - Ideas index

### Notes
**Location**: `/docs/experiments/notes/`

Exploratory notes and development philosophy:
- `window_size.md` - Window size use case notes
- `another-rant.md` - Development philosophy and rants
- `readme.md` - Notes index

### Analysis
**Location**: `/docs/experiments/analysis/`

Comprehensive analysis documents:

| File | Description |
|------|-------------|
| `executive-summary.md` | High-level analysis summary |
| `index.md` | Analysis index and navigation |
| `structure.md` | Codebase structure analysis |
| `organization-recommendations.md` | Documentation organization recommendations |
| `project-summary.md` | Current development phases and approach |

### Archive
**Location**: `/docs/experiments/archive/`

Historical documents and deprecated content:
- `old-readme.md` - Previous README version
- `doclog/` - Historical documentation log
- `why-reactivity.md` - Historical reactivity explanation
- `discussion/` - Archived discussion documents

---

## 📊 STATUS (Project Tracking)

**Location**: `/docs/status/`

Current project status and tracking documents.

| File | Description | Status |
|------|-------------|--------|
| `KERNELS.md` | Kernel test progress dashboard | ✅ Active |
| `STRUCTURE.md` | This document - folder structure reference | ✅ Active |
| `ROADMAP.md` | Development phases and goals | 📝 Planned |
| `DECISIONS.md` | Architecture Decision Records (ADRs) | 📝 Planned |

**Primary tracking document**: `KERNELS.md` - Shows test pass rates for each experimental kernel.

---

## Root Documentation

**Location**: `/` (repository root)

| File | Description |
|------|-------------|
| `readme.md` | Main project README (for GitHub) |
| `CLAUDE.md` | AI assistant guidance document |
| `rewrite.md` | Rewrite planning notes |

---

## Other Directories (Not in /docs/)

### Kernels
**Location**: `/kernels/`

Experimental kernel implementations - each is self-contained with own documentation:
- `graph-first/` - Immutable graph structure approach
- `channel/` - Signal-based message queue
- `auto4/` - Chart-centric design
- `auto2/`, `auto3/` - Historical explorations
- `hooks/`, `middleware/`, `graph/` - Proposed architectures

See `/kernels/README.md` and `/docs/status/KERNELS.md` for details.

### Tests
**Location**: `/tests/`

Test suite (75+ tests) that serves as the specification:
- `files/` - 75+ test cases
- `runall.js` - Main test runner
- `readme.md` - Test documentation

### Examples
**Location**: `/examples/`

Example usage of auto.js features.

---

## Navigation Guide

**If you're a user learning auto.js**:
1. Start: `/docs/user/getting-started.md`
2. Learn: `/docs/user/tutorial.md`
3. Reference: `/docs/user/api-reference.md`

**If you want to understand reactivity concepts**:
1. Start: `/docs/concepts/what-is-reactivity.md`
2. Why: `/docs/concepts/why-reactivity-matters.md`
3. How: `/docs/concepts/how-auto-works.md`

**If you're contributing to auto.js**:
1. Architecture: `/docs/development/architecture.md`
2. Internals: `/docs/development/internals.md`
3. Source: `/docs/development/devlog/src/054_*.js`

**If you're exploring kernel alternatives**:
1. Overview: `/kernels/README.md`
2. Status: `/docs/status/KERNELS.md`
3. Comparison: `/kernels/COMPARISON.md`

---

## Reorganization History

**Previous structure**: Files were scattered across `/docs/` root with nested subdirectories like `discussion/`, `guide/`, `manual/`, `rambling/`.

**Reorganization date**: 2025-12-26

**Changes**:
- Grouped by audience (user, concepts, development, experiments)
- Renamed files for clarity (e.g., `ok-but-what-is-auto.md` → `getting-started.md`)
- Archived duplicates and historical content
- Created dedicated status tracking directory
- Preserved devlog structure completely

**See**: `/docs/REORGANIZATION_PLAN.md` for detailed mapping of old→new locations.

---

## Maintenance

**Adding new documentation**:
1. **User docs** → `/docs/user/` (tutorials, guides, API reference)
2. **Concept explanations** → `/docs/concepts/` (philosophy, theory)
3. **Technical docs** → `/docs/development/` (implementation, architecture)
4. **Research notes** → `/docs/experiments/ideas/` or `/docs/experiments/notes/`
5. **Analysis** → `/docs/experiments/analysis/`
6. **Project tracking** → `/docs/status/`

**Updating this document**: Edit `/docs/status/STRUCTURE.md` when structure changes significantly.

---

## Benefits of This Structure

1. ✅ **Clear audience separation** - Users vs Developers vs Researchers
2. ✅ **Easier onboarding** - Users have clear entry point
3. ✅ **Better maintenance** - Related docs grouped together
4. ✅ **Preserved history** - Archive keeps old docs for reference
5. ✅ **Status visibility** - Dedicated tracking directory
6. ✅ **Self-contained kernels** - Kernel docs stay in `/kernels/`
7. ✅ **Flat navigation** - No excessive nesting, clear paths
