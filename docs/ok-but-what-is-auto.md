
## ok but what is auto

**auto** is a reactivity tool where you connect _values_ to _functions_.
so you create an object

```js
var obj = {
    name1: null,
    name2: 'hello',
    name3: ($) => /* some function */
}
```

and pass it to auto

```js
var $ = auto(obj);
```

and then use `$` in all your dealing

```js
$.name2 = 'jim';
if ($.name3 == 20) console.log("hmmm");
```

but here is the important point: `each function must return a value`.
and this return value is the value of said value...

let's try again: **auto** connects `functions` to `names`. so
in the above `name3` will _always_ have the value corresponding
to it's function. this feels like it can be said a lot more straight-forwardly.

typically in "reactive programming" ... i mean, reactive programming
is really about island functions:

```js
(x) => 2*x
```

so ... you define a function, and don't have a reference to it.
how bizarre - it just sits there and nobody knows about it. in
ordinary programming ... what happened in the development of
computers is someone said "hey let's have functions and then
**call** them" and that seemed like a good idea and it is.
but what about if we don't want to call the function - what
if we want to call the _variable_ .... :|

> that's actually a great tag-line for **auto** - call the variable.
should be a t-shirt

in what people call "reactive programming" today really all it
amounts to is functions that auto-run - a piece of code that
somehow knows, or someone knows, that it is referencing some
values and knows it needs to ... it will have a different
effect ... that one of it's variables change. so:

`function` <- `[variable,variable,variable]`

right. ok, so all functions depend of variables (well functions _can_
depend on variables, or reference variables. better - reference).
and reactive code is basically the statement "what if we have functions
which re-run themselves whenever their referenced variables change?"

and the answer is - well a real nightmare, is what happens. too
much cleverness or assumed cleverness.

anyway, and the point of **auto** is saying "hey, no that is pretty
cool but as long as the function _doesn't change anything_ except
for **one variable** and that variable is only _ever_ changed
by that **one function**.

> hmmm ... `one function one variable` is another great tag-line
> for **auto**. where does that come from? one woman one child?
> that's weird... why would women only be allowed one child?

## the laws of auto

**auto** is reactivity as we know it today except for one rule:

 - `one function one variable`

so any state is determined by only one function - nothing else
is allowed to access it! you cannot access it directly

```js
let $ = auto({data: ($) => 10})
$.data = 20;
```

```
fatal: you cannot set the value of a function (data)
```

and neither can other functions access it

```js
let $ = auto({
    data: ($) => 10,
    func: ($) => $.data = 20
})
```

```
fatal: function func is trying to set the value of a function data
```

and functions can't set plain values either!

```js
let $ = auto({
    data: null,
    func: ($) => $.data = 10
})
```

```
fatal: function func is trying to set value data
```

so ... what on earth does this mean?

 - from the outside you can only change on thing: plain values
 - from the inside functions do just one thing: return a value

and that value is ... man i need to stop rambling...