# Documentation Reorganization Plan

**Created**: 2025-12-26
**Status**: Ready for execution

This document maps the existing 40 markdown files to their new locations in the reorganized structure.

## New Structure Overview

```
/docs/
├── user/              # For people USING auto.js
├── concepts/          # Understanding reactivity & philosophy
├── development/       # For maintainers & contributors
├── experiments/       # Research, exploration, analysis
└── status/            # Project tracking & status
```

---

## File Mapping

### 📘 USER (For Library Users)

New location → Current location

```
user/getting-started.md        ← ok-but-what-is-auto.md
user/api-reference.md          ← syntax.md
user/tutorial.md               ← guide/building-objects-reactively.md
user/advanced-features.md      ← manual/special-functions.md
user/html-integration.md       ← html.md
user/installation.md           ← npm-and-node.md
```

**Rationale**: Clear entry points for users learning or using the library. Renamed for clarity.

---

### 🧠 CONCEPTS (Understanding Reactivity)

New location → Current location

```
concepts/what-is-reactivity.md      ← discussion/what-is-reactivity.md
concepts/why-reactivity-matters.md  ← discussion/reactivity-is-a-game-changer.md
concepts/how-auto-works.md          ← discussion/auto-architecture-observations.md
concepts/async-behavior.md          ← discussion/auto-is-asynchronous.md
concepts/advanced-patterns.md       ← discussion/map-chains.md
```

**Archive** (duplicates/redundant):
```
experiments/archive/discussion/why-reactivity-is-a-game-changer.md  ← discussion/why-reactivity-is-a-game-changer.md (check if duplicate)
experiments/archive/why-reactivity.md                               ← why-reactivity.md (check if duplicate)
```

**Rationale**: Consolidated conceptual explanations. Removed "discussion" nesting - concepts are first-class.

---

### 🔧 DEVELOPMENT (For Maintainers)

New location → Current location

```
development/architecture.md    ← ARCHITECTURE.md
development/internals.md       ← internals.md
development/recorder.md        ← RECORDER.md
development/refactoring.md     ← REFACTORING.md
development/tracing.md         ← explainability.md
development/warp.md            ← WARP.md
development/todo.md            ← todo.md
development/devlog/            ← devlog/ (ENTIRE DIRECTORY - keep structure)
```

**Rationale**: Technical implementation docs. Devlog stays intact as source of truth.

---

### 🧪 EXPERIMENTS (Research & Exploration)

New location → Current location

**Ideas & Explorations**:
```
experiments/ideas/             ← ideas/ (ENTIRE DIRECTORY)
experiments/notes/             ← rambling/ (ENTIRE DIRECTORY - rename for clarity)
experiments/notes/another-rant.md  ← another_rant.md
```

**Analysis Documents**:
```
experiments/analysis/executive-summary.md     ← ANALYSIS_EXECUTIVE_SUMMARY.md
experiments/analysis/index.md                 ← ANALYSIS_INDEX.md
experiments/analysis/structure.md             ← STRUCTURE_ANALYSIS.md
experiments/analysis/organization-recommendations.md  ← ORGANIZATION_RECOMMENDATIONS.md
experiments/analysis/project-summary.md       ← PROJECT_SUMMARY.md (current development phases)
```

**Archive** (historical/deprecated):
```
experiments/archive/old-readme.md   ← old-readme.md
experiments/archive/doclog/         ← doclog/ (ENTIRE DIRECTORY - seems historical)
```

**Rationale**: Separate active experiments (ideas, notes) from completed analysis and historical artifacts.

---

### 📊 STATUS (Project Tracking)

Current location (already in place):
```
status/KERNELS.md              ← status/KERNELS.md (KEEP AS-IS)
```

New files to create:
```
status/STRUCTURE.md            (NEW - this reorganization plan becomes the structure doc)
status/ROADMAP.md              (NEW - to be created later)
status/DECISIONS.md            (NEW - Architecture Decision Records, to be created later)
```

**Rationale**: Centralized project tracking and status visibility.

---

## Execution Plan

### Phase 1: Create Directory Structure
```bash
mkdir -p docs/user
mkdir -p docs/concepts
mkdir -p docs/development
mkdir -p docs/experiments/ideas
mkdir -p docs/experiments/notes
mkdir -p docs/experiments/analysis
mkdir -p docs/experiments/archive
# status/ already exists
```

### Phase 2: Move User Documentation
```bash
mv docs/ok-but-what-is-auto.md docs/user/getting-started.md
mv docs/syntax.md docs/user/api-reference.md
mv docs/guide/building-objects-reactively.md docs/user/tutorial.md
mv docs/manual/special-functions.md docs/user/advanced-features.md
mv docs/html.md docs/user/html-integration.md
mv docs/npm-and-node.md docs/user/installation.md
rmdir docs/guide docs/manual  # Remove empty dirs
```

### Phase 3: Move Concept Documentation
```bash
mv docs/discussion/what-is-reactivity.md docs/concepts/
mv docs/discussion/reactivity-is-a-game-changer.md docs/concepts/why-reactivity-matters.md
mv docs/discussion/auto-architecture-observations.md docs/concepts/how-auto-works.md
mv docs/discussion/auto-is-asynchronous.md docs/concepts/async-behavior.md
mv docs/discussion/map-chains.md docs/concepts/advanced-patterns.md

# Archive potential duplicates
mkdir -p docs/experiments/archive/discussion
mv docs/discussion/why-reactivity-is-a-game-changer.md docs/experiments/archive/discussion/
mv docs/why-reactivity.md docs/experiments/archive/
rmdir docs/discussion  # Remove empty dir
```

### Phase 4: Move Development Documentation
```bash
mv docs/ARCHITECTURE.md docs/development/architecture.md
mv docs/internals.md docs/development/internals.md
mv docs/RECORDER.md docs/development/recorder.md
mv docs/REFACTORING.md docs/development/refactoring.md
mv docs/explainability.md docs/development/tracing.md
mv docs/WARP.md docs/development/warp.md
mv docs/todo.md docs/development/todo.md
mv docs/devlog docs/development/  # Move entire directory
```

### Phase 5: Move Experimental Documentation
```bash
# Ideas
mv docs/ideas docs/experiments/

# Notes (was rambling)
mv docs/rambling docs/experiments/notes
mv docs/another_rant.md docs/experiments/notes/

# Analysis
mv docs/ANALYSIS_EXECUTIVE_SUMMARY.md docs/experiments/analysis/executive-summary.md
mv docs/ANALYSIS_INDEX.md docs/experiments/analysis/index.md
mv docs/STRUCTURE_ANALYSIS.md docs/experiments/analysis/structure.md
mv docs/ORGANIZATION_RECOMMENDATIONS.md docs/experiments/analysis/organization-recommendations.md
mv docs/PROJECT_SUMMARY.md docs/experiments/analysis/project-summary.md

# Archive
mv docs/old-readme.md docs/experiments/archive/
mv docs/doclog docs/experiments/archive/
```

### Phase 6: Create Structure Documentation
```bash
# Convert this plan into the permanent structure reference
cp docs/REORGANIZATION_PLAN.md docs/status/STRUCTURE.md
# Edit STRUCTURE.md to be present-tense (done, not plan)
```

---

## Post-Move Checklist

- [ ] All files moved successfully
- [ ] Empty directories removed
- [ ] `/docs/` root now only contains organized subdirectories
- [ ] Update CLAUDE.md with new structure
- [ ] Update links in readme.md if needed
- [ ] Remove this REORGANIZATION_PLAN.md (merged into status/STRUCTURE.md)

---

## Final Directory Structure

```
/docs/
├── user/
│   ├── getting-started.md          (was: ok-but-what-is-auto.md)
│   ├── api-reference.md            (was: syntax.md)
│   ├── tutorial.md                 (was: guide/building-objects-reactively.md)
│   ├── advanced-features.md        (was: manual/special-functions.md)
│   ├── html-integration.md         (was: html.md)
│   └── installation.md             (was: npm-and-node.md)
│
├── concepts/
│   ├── what-is-reactivity.md       (was: discussion/what-is-reactivity.md)
│   ├── why-reactivity-matters.md   (was: discussion/reactivity-is-a-game-changer.md)
│   ├── how-auto-works.md           (was: discussion/auto-architecture-observations.md)
│   ├── async-behavior.md           (was: discussion/auto-is-asynchronous.md)
│   └── advanced-patterns.md        (was: discussion/map-chains.md)
│
├── development/
│   ├── architecture.md             (was: ARCHITECTURE.md)
│   ├── internals.md                (was: internals.md)
│   ├── recorder.md                 (was: RECORDER.md)
│   ├── refactoring.md              (was: REFACTORING.md)
│   ├── tracing.md                  (was: explainability.md)
│   ├── warp.md                     (was: WARP.md)
│   ├── todo.md                     (was: todo.md)
│   └── devlog/                     (was: devlog/ - unchanged)
│       ├── readme.md
│       ├── src/                    (54 numbered versions)
│       └── doc/
│
├── experiments/
│   ├── ideas/                      (was: ideas/ - unchanged)
│   │   ├── dom-as-state.md
│   │   └── readme.md
│   ├── notes/                      (was: rambling/)
│   │   ├── window_size.md
│   │   ├── another-rant.md         (was: another_rant.md)
│   │   └── readme.md
│   ├── analysis/
│   │   ├── executive-summary.md    (was: ANALYSIS_EXECUTIVE_SUMMARY.md)
│   │   ├── index.md                (was: ANALYSIS_INDEX.md)
│   │   ├── structure.md            (was: STRUCTURE_ANALYSIS.md)
│   │   ├── organization-recommendations.md  (was: ORGANIZATION_RECOMMENDATIONS.md)
│   │   └── project-summary.md      (was: PROJECT_SUMMARY.md)
│   └── archive/
│       ├── old-readme.md           (was: old-readme.md)
│       ├── why-reactivity.md       (was: why-reactivity.md - check duplicate)
│       ├── discussion/
│       │   └── why-reactivity-is-a-game-changer.md  (potential duplicate)
│       └── doclog/                 (was: doclog/ - historical)
│
└── status/
    ├── KERNELS.md                  (existing - kernel test progress)
    ├── STRUCTURE.md                (new - this document, finalized)
    ├── ROADMAP.md                  (to be created)
    └── DECISIONS.md                (to be created - ADRs)
```

---

## Benefits of New Structure

1. **Clear audience separation**: User vs Developer vs Researcher
2. **Easier onboarding**: Users start in `/docs/user/`
3. **Better maintenance**: Development docs grouped together
4. **Preserved history**: Archive keeps old docs for reference
5. **Status visibility**: Dedicated tracking directory
6. **Kernel context**: Remains in `/kernels/` (self-contained)

---

## Notes

- **Devlog is sacred**: `/docs/development/devlog/` moves as entire directory, structure unchanged
- **Kernel docs stay put**: `/kernels/*/` are self-contained, not affected by this reorganization
- **Examples directory**: `/examples/` at root is unaffected
- **Tests directory**: `/tests/` at root is unaffected
- **Root files**: `/readme.md`, `/CLAUDE.md` stay at root
