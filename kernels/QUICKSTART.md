# Quick Start Guide

## Running Tests

From the `kernels/` directory:

```bash
# Test all tests for a kernel
node test-runner.js channel

# Test a single test file
node test-runner.js channel 001

# Verbose output
node test-runner.js channel --verbose
```

## Current Status

### Channel Kernel
- ✅ Test runner works
- ❌ Tests not passing yet (work in progress)
- Issues to fix:
  - `fatal` should be `{}` not `null`
  - Values not being initialized
  - `deps` format is wrong (array vs object)

## Next Steps

### To Complete Channel Kernel

1. Fix initialization:
```javascript
state.fatal = {};  // not null
```

2. Fix deps format - tests expect:
```javascript
{ count: { data: true } }  // not { count: ['data'] }
```

3. Initialize values properly during bootstrap

### To Start a New Kernel

1. Create directory:
```bash
mkdir kernels/hooks
cd kernels/hooks
```

2. Create `auto.js`:
```javascript
// Your implementation here
export default function auto(obj, options = {}) {
    // ...
}
```

3. Test it:
```bash
cd ..
node test-runner.js hooks
```

## Test Format

Each test has:
```javascript
export default {
    obj: { /* initial state */ },
    fn: ($, global) => { /* test code */ },
    opt: { /* options */ },
    _: { /* expected internal state */ },
    global: { /* expected global state */ }
}
```

Your kernel must expose `$._` with:
```javascript
{
    fn: [...],           // array of function names
    deps: {...},         // dependency map
    value: {...},        // current values
    subs: {...},         // subscriptions
    fatal: {}            // error state
}
```

## Examples

### Minimal Passing Test (001_empty)

Input:
```javascript
{
    obj: {},
    fn: () => {},
    _: {
        fn: [],
        deps: {},
        value: {},
        subs: {},
        fatal: {}
    }
}
```

Your kernel should:
1. Accept empty object `{}`
2. Return proxy with `._` property
3. `._` has correct structure

### Simple Value Test (002_just_one_value)

Input:
```javascript
{
    obj: { data: null },
    fn: () => {},
    _: {
        fn: [],
        deps: {},
        value: { data: null },
        subs: {},
        fatal: {}
    }
}
```

Your kernel should:
1. Store static value
2. Expose it in `_.value`

### Function Test (003_just_one_function)

Input:
```javascript
{
    obj: { func: () => 'val' },
    fn: () => {},
    _: {
        fn: ['func'],
        deps: { func: [] },
        value: { func: 'val' },
        subs: {},
        fatal: {}
    }
}
```

Your kernel should:
1. Detect function
2. Track in `_.fn`
3. Execute it
4. Store result in `_.value`
5. Track deps in `_.deps`

## Tips

1. **Start small**: Get 001_empty passing first
2. **One at a time**: Then 002, 003, etc.
3. **Debug**: Use `--verbose` and console.log
4. **Compare**: Look at `docs/devlog/src/` for reference
5. **Ask**: Check test file to see what it expects

## Common Issues

### "require is not defined"
- Use ES6: `import` not `require`
- Use ES6: `export default` not `module.exports`

### "Cannot find module"
- Use `.js` extension in imports
- Use file:// URLs (test runner handles this)

### Tests fail with wrong structure
- Check `$._` format
- Tests expect specific structure
- Look at passing kernel for reference

## Good Luck!

You're exploring architectural approaches. Don't worry about passing all tests immediately. Focus on understanding the core idea of each approach and how features become pluggable.
