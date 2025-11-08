

let's say we have a function which produces some data.

```js
let data = source();
```

let's say we want to log this out when it's done.

```js
let data = source();
console.log(data);
```

what if the function takes time?
then have to pass into the function
what to do when it is done.

```js
let finished = data => console.log(data);
source(finished);
```

what has just happened?
how is this different to before?

- in the first instance we said 1. do this, and then 2. do this
- in the second instance we said .. got the function to decide when to do what's next ...