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

## three methods

## the `atom` object

## the wrapper