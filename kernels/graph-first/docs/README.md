# Documentation Directory

This directory contains practical guides for using and understanding the three-layer graph-first architecture.

## Quick Navigation

### Getting Started

**New to the three-layer architecture?** Start here:

1. **[../THREE-LAYERS.md](../THREE-LAYERS.md)** - The core concept
2. **[../LAYERED-IMPLEMENTATION.md](../LAYERED-IMPLEMENTATION.md)** - How it's implemented
3. **[MIGRATION-GUIDE.md](MIGRATION-GUIDE.md)** - Migrating from current Auto.js

### Practical Guides

**Using the three-layer architecture:**

- **[STRATEGY-GUIDE.md](STRATEGY-GUIDE.md)** - Choosing dependency tracking strategies
  - Static Analysis vs Runtime Tracking vs Explicit
  - Decision tree and recommendations
  - Real-world examples
  - Common mistakes

- **[MIGRATION-GUIDE.md](MIGRATION-GUIDE.md)** - Converting existing code
  - API compatibility guide
  - Step-by-step migration
  - Test conversion
  - Common issues and solutions

- **[SIDE-BY-SIDE.md](SIDE-BY-SIDE.md)** - Direct comparison
  - Same code in both architectures
  - What happens internally
  - Performance characteristics
  - Feature comparison

### Completion Status

- **[COMPLETION.md](COMPLETION.md)** - Full implementation summary
  - What was built
  - Key achievements
  - How to use it
  - Status: ✅ Complete

## Files in This Directory

| File | Purpose | Read When |
|------|---------|-----------|
| **MIGRATION-GUIDE.md** | Convert existing Auto.js code | Migrating to three-layer architecture |
| **STRATEGY-GUIDE.md** | Choose dependency strategy | Deciding between Static/Runtime/Explicit |
| **SIDE-BY-SIDE.md** | Compare architectures | Understanding differences |
| **COMPLETION.md** | Implementation summary | Want full overview of what was built |
| **README.md** | This file | Finding documentation |

## Related Documentation

### Core Concepts (Parent Directory)

- **[../INSIGHT.md](../INSIGHT.md)** - Why Auto.js exists
- **[../README.md](../README.md)** - Graph-first overview
- **[../WHAT-IS-DIFFERENT.md](../WHAT-IS-DIFFERENT.md)** - Current vs graph-first
- **[../DETAILED-COMPARISON.md](../DETAILED-COMPARISON.md)** - Deep technical comparison
- **[../DYNAMIC-DEPENDENCIES.md](../DYNAMIC-DEPENDENCIES.md)** - Handling conditionals

### Complete Documentation Index

See **[../INDEX.md](../INDEX.md)** for the complete documentation index with all files organized by category.

## Quick Start

### 1. Understand the Concept
```bash
# Read these in order
cat ../THREE-LAYERS.md
cat ../LAYERED-IMPLEMENTATION.md
```

### 2. Run the Tests
```bash
cd ..
node tests/test-layers.js
# 22 passed, 0 failed ✓
```

### 3. Run the Example
```bash
node example-layered.js
# See all three layers working
```

### 4. Choose Your Strategy
```bash
# Read strategy guide
cat docs/STRATEGY-GUIDE.md

# Default: Static Analysis (recommended for most cases)
# Runtime: For computed property access or expensive branches
# Explicit: For maximum control and documentation
```

### 5. Start Using It
```javascript
import auto from './src/auto-layered.js';

const $ = auto({
    data: null,
    count: ($) => $.data?.length ?? 0,
    msg: ($) => `Got ${$.count} items`
});

$.data = [1, 2, 3];
console.log($.msg);  // "Got 3 items"
```

## Common Questions

### Q: Is this compatible with current Auto.js?

**A:** Yes! The API is identical. See [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md).

### Q: Which dependency strategy should I use?

**A:** Start with Static Analysis (the default). See [STRATEGY-GUIDE.md](STRATEGY-GUIDE.md) for details.

### Q: How is this different from current Auto.js?

**A:** Same API and behavior, but clearer architecture. See [SIDE-BY-SIDE.md](SIDE-BY-SIDE.md).

### Q: Can I use DirectedGraph for non-Auto.js purposes?

**A:** Absolutely! It's a generic graph data structure. See Layer 1 examples in `example-layered.js`.

### Q: What if I have dynamic dependencies (conditionals)?

**A:** The three strategies handle this differently. See [STRATEGY-GUIDE.md](STRATEGY-GUIDE.md) and [../DYNAMIC-DEPENDENCIES.md](../DYNAMIC-DEPENDENCIES.md).

## Contributing

This is an experimental kernel for exploring the graph-first architecture. Feel free to:
- Try the implementation with real use cases
- Add more examples or documentation
- Suggest improvements
- Report issues

## Status

✅ **Complete and working**
- All three layers implemented
- 22 tests passing
- Comprehensive documentation
- Working examples
- Ready to use

See [COMPLETION.md](COMPLETION.md) for full implementation summary.
