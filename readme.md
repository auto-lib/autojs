
## manifesto

reactivity has immense potential but it is currently broken.

> see [what i mean by reactivity](docs/discussion/what-i-mean-by-reactivity.md),
> [why reactivity is a game changer](docs/discussion/why-reactivity-is-a-game-changer.md) and 
> [why reactivity is broken right now](docs/discussion/why-reactivity-is-broken-right-now.md).

the solution to this is [reactivity with no side effects](docs/discussion/reactivity-with-no-side-effects.md)
and **auto** provides this as a javascript library.

> check out the next section for what this looks like in practice.

## tiny tutorial

you use `auto` like this

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => $.data + " has " + $.count + " items"
})
```

> see [manual/syntax.md](docs/manual/syntax.md) for a breakdown of the syntax.

now when you use `$` everything updates automatically
including nested relationships

```js
$.data = [1,2,3];
console.log("msg =",$.msg);
```

```
msg = 1,2,3 has 3 items
```

this is much like other reactivity libraries but with the following
it's quite different

```js
let $ = auto({
    data: null,
    update: ($) => $.data = [1,2,3]
})
```

```
fatal: function update is trying to change value data
```

see the aforementioned discussions on why this is a
_really good idea_.

## features

besides no side affects what makes **auto** great is that it's
design is _really simple_, it is _really robust_, and you can _debug it_.

### really simple design

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
some of them in [tests/](tests/) and you'll see they each perform an exact match
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
to see what different states are produced by which
situations and also [tutorial/explainability.md](docs/tutorial/explainability.md)
for a walkthrough of what these mean.

## environments

each version of **auto** is in the root folder:

 - `auto-commonjs.js`
 - `auto-es6.js`
 - `auto-no-export.js`

they are all the same except for the last line (the export statement).

### npm and node

run `npm install @autolib/auto`
and then import with `const auto = require('@autolib/auto');`.
see [docs/npm-and-node.md](docs/npm-and-node.md) for
a walkthrough.

### es6 module

simply use the right, i.e. `const auto = import('auto-es6.js');`
to test you could use `deno`
i.e. `deno run test.js`. see
[docs/npm-and-node.md](docs/npm-and-node.md)
for a template - just replace the import statement.

### browser

in a `<script>` tag link to `auto-no-import.js`.
see [docs/html.md](docs/html.md) for a walk-through.

## integrations

**auto** was originally developed to be used with Svelte (see below)
but other specific integrations with React, Vue, Mithril etc.
still need to be done. however **auto**'s _subscribe_ method makes it easy
to tie it into any existing framework.

### subscribe

todo

### svelte

todo

## development

this library started as an attempt to create MobX-like observables
in Svelte. that original version was based largely on a video by MobX's creator
(see the [docs/old-readme.md](docs/old-readme.md) for more on this).
then a new approach written up from scratch in a day which
was documented with extreme detail in [docs/devlog](docs/devlog).

## what's left out

what i can imagine some people might want in **auto**
(because of what i've seen in other reactive libraries)
but that i left out on purpose.

### side affects

this is the big one - really the reason this library had to be made.
it's a long story but basically all reactivity these days allows
one to do this:

```js
alwaysRun( () => {

    some_variable = 10;
    another_variable = [1,2,3];

    do_something();
    do_something_else();
})
```

the idea is that the whole block of code will re-run
any time any of the referenced variables i.e. `some_variable`
or `another_variable` change. this is a _terrible_ idea,
and **auto** was created specifically to do reactivity correctly,
or rather to hone it down to one idea: automatic _variables_,
not code.

i need to write this up properly.

### nested reactivity

there was a version of the old library (`mobx-svelte`)
that had nested reactivity (because i saw the
MobX creator use it in the video that started this)
but i didn't put it into the new one.
i'm still haven't come across a convincing use-case.
i'm using **auto** in a very large project
and never needed nesting. i'd rather leave it
out for now.