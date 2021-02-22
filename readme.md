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

In fact, I have yet to see an example of computed values using
a direct object like this i.e. I may be the first!

## Example

`main.js` is the example code. To run from the command line
you should just use `deno` https://deno.land/

```
deno run main.js
```

since it uses ES6 modules (and those are a real pain with NodeJS).

You should get this:

```
C:\Users\karlp\my-mobx>deno run main.js
[subscribe] subdata =  Not found
[subscribe] subsubdata =  Not found1
[autorun] subdata =  Not found
[autorun] subsubdata =  Not found1
[subscribe] subdata =  3
[subscribe] subsubdata =  4
[autorun] subdata =  3
[autorun] subsubdata =  4
```

This is what main looks like:

```js
import { observable } from './observable.js';
import { autorun } from './box.js';

const makeStore = () => observable({

    data: null,
    
    get subdata() {
        if (this.data) return this.data.length;
        else return "Not found"
    },

    get subsubdata() { return this.subdata + 1; }

});

const store = makeStore();

store.$mobx.subdata.subscribe( (val) => console.log("[subscribe] subdata = ",val));
store.$mobx.subsubdata.subscribe( (val) => console.log("[subscribe] subsubdata = ",val));

autorun( () => {
    console.log("[autorun] subdata = ",store.subdata);
});

autorun( () => {
    console.log("[autorun] subsubdata = ",store.subsubdata);
});

store.data = [1,2,3];
```

So we create a store (just an object wrapped in `observable`),
subscribe to some of the values,
use autorun (which in Svelte is exactly the same as wrapping
statements using `$: {}` i.e. reactivity).

We have two derived values in the object: `subdata` and `subsubdata`.
When we modify `data` then `subdata` should change.
And then `subsubdata` should change (since it depends on `subdata`).
This ensures that nested effects to propogate.

## Svelte

Note that Svelte is not in this repo. This is just an example:
in Svelte code you would save out the values as a store as such:

```Svelte
let data = store.$mobx.data;
$: console.log("data = ",$data)
```

You really should watch the video to see how this works
(though I am still confused by Javacript `this` and clojures...)

## WrapInAction

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
    store.data = [2,3,4;
    store.finished = false;
})
```

I still need to figure out how this is done.