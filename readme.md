**auto** is a 100-line reactivity library
that works the same way as MobX's `observable`:

```js
let $ = auto({
    data: null,
    get count() { if (this.data) return data.length; else return 0; }
    get msg() { return "Found "+this.count()+" entries" }
})
```

## simple

**auto** uses no external libraries.
the entire internal state is determined by five variables.
here are the first 10 lines of the library, `auto.js`:

```js
let auto = (object) => {

    let running;    // used to track variable usage
    let dep = {};   // dependencies for each variable
    let dirty = {}; // variables that need to be updated
    let fs = {};    // update functions for each variable
    let value = {}; // last calculated variable values

    // ...
```

## robust

each of these are flat structures. the dependencies
of `get count()` in the example above are in an array
in `dep.count`. similarly for whether `count` needs
to be re-calculated (`dirty.count`) and what the
last calculated value is (`value.count`). all these
structures sit outside of the functions that change
things. these are the three methods internally in
the **auto** library:

 - `update(tag)` update the value of variable named `tag` (here we use `tag` and not `name` because of autorun blocks. see below)
 - `getter(tag)` get the value of `tag`, updating if dirty. if `running` is set, add to `running`s dependencies
 - `setter(tag,value)` put `val` into `tag`, updating / making dirty each dependency as needed


## explainable

this makes it trivial to understand what is happening
at any point in time: simply print out the `_` member
of the returned _auto_ object.

```js
console.log($._);
```

> {
>     dep: ['count': ['data'], 'msg': ['data','count']],
>     dirty: { msg: true },
>     value: { data: [1,2,3], count: 3 }
> }

(We leave out `running` and `fns` since they are not useful to see).

Notice how we can tell directly what is happening: what depends
on what, what will be updated on next access, and what the values
are now. This is the core of reactivity and `auto` makes these
explicit.

## development

this library started as an attempt to create MobX-like observables
in Svelte. this was based largely on a video by MobX's creator.
see the [old readme](docs/old-readme.md) for more. then a new
approach was started and written from scratch in a day which
was documented in [extreme detail](docs/devlog).