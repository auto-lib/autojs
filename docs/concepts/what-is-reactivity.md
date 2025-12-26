
## what is reactivity

reactivity is events attached to variable access,
particularly to variable changes.

```js
let x = null;

let function_to_run_when_x_changes = (new_value_of_x) => {

    // ...
}
```

so now if any line in the code anywhere says `x = [1,2,3]`
then `function_to_run_when_x_changes([1,2,3])` will run.

> another interesting idea is attaching functions to
> whenever a variable is _read_ e.g. somewhere in the
> code it says `let y = x`. could be useful for
> debugging ... though this is not the focus of
> reactive programming

why go to the trouble of reacting to variables changing?
because you can do some rather cool things:

```js
let x = null;
let y = null;

let function_to_run_when_x_changes = (new_value_of_x) => {

    y = x * 2;
}
```

now `y` will always be equal to double `x` presuming the
reactivity has been implemented correctly (which if you're
like me is fun to learn about [how to implement reactivity
a primer](docs/discussion/how-to-implement-reactivity-a-primer.md)).

### flavors of reactivity

how this is presented in practice differs a great deal.

#### rxjs

for example, **rxjs** looks at variable changes as
streams of events and your job as programmer is to
link these streams together.

```js
// emit every 1s, take 2
const source$ = interval(1000).pipe(take(2));
// map each emitted value from source to interval observable that takes 5 values
const example$ = source$.pipe(
  map(val =>
    interval(1000).pipe(
      map(i => `Result (${val}): ${i}`),
      take(5)
    )
  )
);
```

i find this style difficult to read and understand, though
there does seem to be a deep truth in there about what
it means when you have so many events happening at once
(and i should mention - **rxjs** is not concerned only
with variable changes as event but rather _all possible events_
like clicks or, as in the above example, a timer going off).
it's worth looking into **rxjs** to see what this approach
could mean.

#### mobx

another popular library is **mobx** from which **auto**
steals most of it's style. in **mobx** you also define
an object, wrap it, access it's variables as per
normal and define "derived or computed quantities":

```js
let state = observable({
    data: null,
    get count() { return this.data ? this.data.length : 0 }
})
```

the format is slightly different but works the same way.
however, it doesn't enforce no side effects (you can say
`this.data = [1,2,3]` inside of `count()`) and it also
allows you to run blocks of reactive code using `autorun`

```js
autorun( () => {
    console.log("data =",state.data);
    // do literally anything else
}
```

and now this nameless, floating-in-space function
will run whenever any of the variables it access
i.e. `data` here are changed... it seems really
cool but it leads to incredible problems in
tracking effects through your software.
[discussion/when-reactivity-goes-bad.md](docs/discussion/when-reactivity-goes-bad.md).
i've yet to find a good reason to have this kind
of automatically running block of code.

#### svelte

this whole shpeel started for me with svelte
which has reactivity built in much the same
way that mobx does but again a different
flavor:

```js
$: x = y * 2
$: {
    console.log("data =",data);
```

so in both cases we use the special `$:`
designator to mark reactive code.
however, the first line defines a
variable in much the same way as
**auto** or mobx does. and the second
line is precisely like an `autorun`
block where anything inside will run
any time variables inside change.

again, though, there are no protections
against changing these variables anywhere
you like:

```
x = 20;
```

which is why you never know why things
changed, and why i spent nearly 3 years
terrified of touching the software i
had built because i decided to use
this magic code feature all over the place.
the answer, which i have culminated in
this repo, is to only have _one_ place
where a variable's value is determined!

> i still need to come up with a name for this
> because it's not just about side effects ...
> which implies it's just the functions you
> connect to a variable which should try
> to change the state ... that's not the core
> issue. the core issue is having multiple
> places which determine a variable ...
> which means you have multiplying path lines
> through which your reactions flow!

> how about `single variable definition`?
> `unidirectional flow` would be good if it
> makes sense ... sort of like how react
> sells it's architecture.
> `unidirectional reactivity` ... hmmm ...
> that definitely has the right flavor.
> it's more correct and even visualizable
> than _reactivity without side effects_.
> i mean, side effects? it's a big question
> mark when you first hear it....
> though _reactivity without side effects_
> feels super trendy. like click bait.
> "oh wow, i must read about this".
> `unidirectional reactivity` is like
> a medical term.