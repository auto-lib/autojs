# mobx-svelte

This should really be named something else
(`reactive-state-with-derived-values-and-pub-sub`?)
but the reason I wrote it is that
I have a huge Svelte project filled with global
stores (`$`) and I wanted to use MobX's derived
values to simplify the reactive logic.

## Architecture

This is not **MobX**. It's a from-scratch implementation.
(Why? Couldn't find one that worked with Svelte.
In fact it seems it will never happen https://github.com/sveltejs/svelte/issues/5172).

The person who wrote MobX gave a brilliant talk
walking through how to implement the code of MobX
from scratch https://www.youtube.com/watch?v=NBYbBbjZeX4.
This repo is basically using that.
I just needed to add a few things:

 - Derived values. That wasn't included in the talk
 - Subscriptions contract. This makes these work with Svelte

Note: the word _derived_ and _computed_ seem to be
interchangable in the MobX community.

Also I should note that MobX has various styles of usage,
the most popular is using Javascript classes and then
calling `makeAutoObservable(this)` in the contructor:

```js
class Timer {
    data = null
    constructor() {
        makeAutoObservable(this, {
            data: observable,
            count: computed
        })
    }
    get count() { if (data) return "N/A"; else return data.length }
}
```

Not sure why this is popular - never liked classes.
Also it's far more verbose - seems you need to specify
which properties are observable / derived (note: I have
only just started learning about MobX).

The other approach (which is what Michel uses in the video)
just uses a plain object and wraps it in a function:

```js
const Timer = observable({
    data: null,
    get count() { if (data) return "N/A"; else return data.length }
})
```

## Example

`main.js` is the example code. To run from the command line
you should just use `deno` https://deno.land/

```
deno run main.js
```

since it uses ES6 modules (and those are a real pain with NodeJS).

You should get this:

```
C:\Users\karlp\mobx-svelte>deno run main.js
[subscribe] count =  N/A
[subscribe] count_plus_delta =  N/A1
[autorun] count =  N/A
[autorun] count_plus_delta =  N/A1
----- init over ----
[subscribe] count =  3
[subscribe] count_plus_delta =  4
[autorun] count =  3
[autorun] count_plus_delta =  4
----- setting data again ----
[subscribe] count =  4
[subscribe] count_plus_delta =  5
[autorun] count =  4
[autorun] count_plus_delta =  5
----- running in action ----
[subscribe] count =  5
[subscribe] count_plus_delta =  7
[autorun] count =  5
[autorun] count_plus_delta =  7
```

This is what main looks like:

```js

import { observable } from './observable.js';
import { autorun, runInAction } from './box.js';

const makeStore = () => observable({

    data: null,
    delta: 1,

    get count() {
        if (this.data) return this.data.length;
        else return "N/A"
    },

    get count_plus_delta() { return this.count + this.delta; }

});

const store = makeStore();

store.$mobx.count.subscribe( (val) => console.log("[subscribe] count = ",val));
store.$mobx.count_plus_delta.subscribe( (val) => console.log("[subscribe] count_plus_delta = ",val));

autorun( () => {
    console.log("[autorun] count = ",store.count);
});

autorun( () => {
    console.log("[autorun] count_plus_delta = ",store.count_plus_delta);
});

console.log("----- init over ----");

store.data = [1,2,3];

console.log("----- setting data again ----");

store.data = [1,2,3,4];

console.log("----- running in action ----");

runInAction( () => {

    // should get just one set of outputs (not one per assignment)
    store.data = [1,2,3,4,5];
    store.delta = 2;
});
```

So we create a store (just an object wrapped in `observable`),
subscribe to some of the values,
use autorun (which in Svelte is exactly the same as wrapping
statements using `$: {}` i.e. reactivity).

We have two derived values in the object: `count` and `count_plus_delta`.
When we modify `data` then `count` should change.
And then `count_plus_delta` should change too (since it depends on `count`).
This shows that nested affects propogate correctly.

## Svelte

Note that Svelte is not in this repo. This is just an example:
in Svelte code you would save out the values as a store as such:

```Svelte
let data = store.$mobx.data;
$: console.log("data = ",$data)
```

You really should watch the video to see how this works
(though I am still confused by Javacript `this` and clojures...)

## runInAction

The only issue left (for my purposes) is making sure you can
suspend the updates if needs be, e.g. say you wanted to
make several changes that all need to happen at once
before the reactions happen:

```js
store.data = [2,3,4];
store.finished = false;
```

In MobX you do this by wrapping code in `runInAction`

```js
runInAction( () => {

    // should get just one set of outputs (not one per assignment)
    store.data = [1,2,3,4,5];
    store.delta = 2;
});
```

This is now working - we only get one set of outputs.
Otherwise you would get effects for each assignment - 
this instead just let's you do what you need and
only the values are set - no effects are run.
During this all the observables are tracked
globally.
Then right at the end we run them all.

### Duplicate functions

One big issue was making sure `runInAction` didn't run
multiple functions. So I needed to make sure by storing
the functions in each `autorun`:

```js
export function autorun(fn,func) {
```

Here `fn` is the function to run
but `func` is the source.

```js
obj.subscribe = (fn) => {
    autorun(() => fn(obj.get()), fn)
    return () => {console.log("unsub");} // for svelte. unsub is TODO
}
```

Now we use the `func` to check if we need to run them in an action.

```js
// don't execute reactions if in an runInAction
if (inAction) obj.observers.forEach(o => { 

    // need to check if the original functions are the same...
    let found = false;
    actionObservers.forEach(a => { if (a.func === o.func) found = true; });
    if (!found) actionObservers.push(o);
})
```

## Memoizing derived values

Another issue I found was that the derived values
were being run each time they were being accessed.
So I wrapped the getter in `autorun`:

```js
// if it's a getter...
if (descriptor.get)
{
    // memoize
    autorun( () => { res.$mobx[key].set(descriptor.get.call(res)) })
}
```

Took forever to get it right. Looks like everything now is
just `autorun`: subscriptions, derived value memoization...

### Testing

To check that values are in fact memoized, put a console log
inside of the computed function.

## Nested properties

I wrote out part of the example code from the talk into `talk.js`:

```js

import { observable } from './observable.js';
import { autorun, runInAction } from './box.js';

const store = observable({
    todos: [
        {
            title: "Learn observable",
            done: false
        },
        {
            title: "Learn autorun",
            done: true
        },
        {
            title: "Learn computed",
            done: true
        },
        {
            title: "Learn action",
            done: true
        }
    ],
    unfinished: 0
});

autorun(() => {
    console.log("**Computing**");
    store.unfinished = store.todos.filter(todo => !todo.done).length;
});

const d = autorun( () => {
    console.log("Amount of todos left: " + store.unfinished);
});

store.todos[0].done = true;
```

The output is

```
C:\Users\karlp\mobx-svelte>deno run talk.js
**Computing**
Amount of todos left: 1
**Computing**
Amount of todos left: 0
```

This shows that nested properties works.

## Unneeded side-affects

In the talk as well you see that if you double the
todo setting

```js
store.todos[0].done = true;
store.todos[0].done = true;
```

you should get the same output as before.

```
C:\Users\karlp\mobx-svelte>deno run talk.js
**Computing**
Amount of todos left: 1
**Computing**
Amount of todos left: 0
```

The way I implemented this is to just ignore
any set statements that have the same value
as before:

```js
obj.set = (val) => {

    if (val == value) return;
```

though I'm worried this might be a bug:
do we still need to track sets
even if the value was unchanged?