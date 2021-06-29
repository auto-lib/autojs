# design features

what makes **auto** great is that it's
design is _really simple_, it is _really robust_, and _you can debug it_.

### simple design

the **auto** library is 150 lines long, it uses no external libraries
and the code is flat and clean

 - 7 state variables
 - 3 main functions and 4 helpers functions
 - an init block.

see [manual/internals.md](docs/manual/internals.md) for details on these.
also worth reading is the devlog
[docs/devlog](docs/devlog) of its development and design choices.

### really robust

**auto**'s internals are checked precisely by the tests. take a look at
the [tests/](tests/) which perform an exact match
on the state including the call stack, function dependencies and fatal errors.

### you can debug it

**auto**'s internal variables are easy to interpret
and are available at any time in the `_` variable so

```js
console.log($._)
```

will print something like

```js
{
    fn: ['count'],
    subs: [],
    deps: { count: ['data'] },
    value: { data: [1,2,3], count: 3 },
    fatal: {}
}
```

it's worth looking at the tests in [tests/](tests/)
to see what different states are produced in various
situations and also [tutorial/explainability.md](docs/tutorial/explainability.md)
for a walkthrough of what these mean.

> a lot of these documents have overlapping information which i should sort out
