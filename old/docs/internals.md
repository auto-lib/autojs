# internals

the entire **auto** library is made up of four parts:

 - five state variables
 - three methods
 - the `atom` object
 - the wrapper

## five state variables

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
### robust

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


## three methods

## the `atom` object

## the wrapper