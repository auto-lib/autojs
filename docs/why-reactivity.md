why one should use **auto**
can be split into two parts: why is _reactivity_
useful, and what sets _apart_ from other
reactive solutions.

### why reactivity

reactivity takes away two things that are a lot
of work to manage in any given program:
sequencing and wiring;

#### sequencing

consider one of the variables we defined above: `msg`.
how would one typically produce such a variable
so that we could use it somewhere as in

```js
console.log("msg =",msg)
```

we would have to build it up:

```js
let data = [1,2,3]; // for example
let count = data.length;
let msg = data + " has " + count + " items"
```

however, now what happens if `data` changes?
we would have to execute the subsequent
lines again:

```js
data = [3,3];
count = data.length;
msg = data + " has " + count + " items"
```

this is error prone: we have to ensure
we update `count` each time correctly
_before_ we calculate `msg`.

#### wiring

what if we instead create a special function
to calculate the correct value of `msg`:

```js
let get_count = (data) => data ? data.length : 0;
let get_msg = (data) => data + " has " + get_count(data) + " items"
```

now we just say `get_msg(data)` will work. however,

code can be thought of as having three elements:

 1. functions
 2. wiring
 3. order of execution

reactive tools allow one to not worry about `2.` and `3.`:
instead of managing how variables are produced
one defines the _relationships_ between explicitly. to explain:

after you set a value member of the returned wrap object (`$`)

```js
$.data = [1,2,3]
```

any subsequent access to function
members will produce the correct result based
on the relationships you defined.

```js
console.log("msg =",$.msg);
```

```
msg = 1,2,3 has 3 items
```

#### so what?

notice that we defined a nested
dependency: `msg` depends on `count`
which depends on `data`. if you coded
this in the standard way, i.e. with functions,
it would have been succeptible to bugs:

```js
let data = null;
let count = (data) => data ? data.length : 0;
let msg = (data, count) => data + " has " + count + " items";

data = [1,2,3];
console.log("msg = ",msg(data, count(data));
```

in this case we are responsible for ensuring:

 - functions are called in the _right order_
 - functions are _wired together properly_

this is why a reactive library can be
so useful in software that has complex
relationships between variables:
you are no longer responsible for
tying things together and ensuring
the execution happens in the right order
(note, though, that reactivity libraries
can be used [very badly](docs/bad-reactivity.md)).

however, what makes **auto** different from
other reactive libraries like MobX and
rxjs or the reactive functionality in SvelteJS?