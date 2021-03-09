
## manifesto

reactivity has immense potential but is currently broken.

> see [docs/why-reactivity.md](docs/why-reactivity.md) and [docs/bad-reactivity.md](docs/bad-reactivity.md)
for wordier versions of this.

**auto** reckons it can fix things by enforcing
no side affects [docs/no-side-affects.md](docs/no-side-affects.md).

> check out the next section for a taste of what this means.

## tiny tutorial

you use `auto` like this

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => $.data + " has " + $.count + " items"
})
```

and then everything updates automatically

```js
$.data = [1,2,3];
console.log("msg =",$.msg);
```

```
msg = 1,2,3 has 3 items
```

> see [docs/syntax.md](docs/syntax.md) for a breakdown of the syntax.

this is much like other libraries but this is different:

```js
let $ = auto({
    data: null,
    update: ($) => $.data = [1,2,3]
})
```

```
fatal: function update is trying to change value data
```

see [docs/no-side-affects.md](docs/no-side-affects.md) on
why this is a _really good idea_.

## features

besides the fundamental differences with other reactivity tools
what makes **auto** great is it's
really _simple_, it's really _robust_, and you can _debug it_.

### simple

the **auto** library is 150 lines long and uses no external libraries.
the code is flat and clean:

 - all state is in 6 variables
 - the code is comprised of 3 functions, 3 helpers and an init block.

it's really worth trying to understand
the whole thing [docs/internals.md](docs/internals.md).
the entire development from _scratch_
is documented with all the thinking and
design choices in
[docs/devlog](docs/devlog).

### robust

several things make **auto** robust
but each need their own explanations:

 - update functions cannot change the state [docs/no-side-affects.md](docs/no-side-affects.md)
 - setting values don't trigger side affects [docs/lazy-evaluation.md](docs/lazy-evaluation.md)
 - this _is_ standard but worth mentioning [docs/circle-detection.md](docs/circle-detection.md)
 - but this certainly is not: tests check the _entire_ internal state (not just values) [docs/deep-testing.md](docs/deep-testing.md)

### debug it

**auto**'s internal variables are easy to interpret:
looking at them explains behaviour.
they can be viewed via the special `_` member. for example

```js
console.log($._)
```

will print something like

```js
{
    dep: ['count': ['data'], 'msg': ['data','count']],
    dirty: { msg: true },
    value: { data: [1,2,3], count: 3 }
}
```

see [docs/explainability.md](docs/explainability.md)
for a walk-through on what these variables mean.

> TODO the internal variables have changed a bit recently

## environments

note each version of **auto** is in the root folder:

 - `auto-commonjs.js`
 - `auto-es6.js`
 - `auto-no-export.js`

they are the same except for the last line
and are generated from the last file in [docs/devlog](docs/devlog).

### npm and node

run `npm install @autolib/auto`
and then import with `const auto = require('@autolib/auto';`.
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