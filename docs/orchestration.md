# orchestration

in this doc i'll talk about what orchestration is,
how it may be the biggest source of complexity
in software and try to show that it is unnecessary.

## what is it

orchestration is making sure things happen in the right order.

let's take a web app as an example.
what separate things might occur?

1. fetch data from a server
2. update the dom (render ui)
3. user interaction

of course these are linked:

 a. `2.` must be run after `1.`
 b. `3.` triggers `1.` which in turn, then, triggers `2.`

how do we ensure these happen in the right order?
uptil now we have primarily used the paradigm
of functions, that is, linear sequences of commands which
are linked to one another through _calls_.

```js
let fetch_data = () => {
    /* ... */
    update_dom();
}
let update_dom = () => {
    /* ... */
}
let user_interact = () => {
    /* ... */
    fetch_data();
}
```

## ignore the following (old readme)

that gets data from a server and displays it.
in the simplest case it would involve two parts:

1. fetch data from server
2. convert data into the dom

that seems simple enough but note how order matters:
you must do `1.` before `2.`.

## details

in a real world scenario one would expect at least two more
steps:

a. modify the fetch
b. process the data

in `a.` we change the url or parameters passed to the server
to get a different dataset. in `b.` we map what we got from
the server into a format our dom code likes.

in addition and crucially `a.` and often `b.` are themselves
modified by the user interface - when you select _rows returned_
or _show active entries_ then for example the server call
is changed.

and here typically the real orchestration happens: every
interaction with the interface must be tied into the
software structure.

- user clicks `show active` toggle
- fetch data from server
- process data
- convert data into dom

## on and on

it's important to recognise this as an intractable
problem: only a unitary pipeline architecture where
the entire state lives in one place and every change
to it is followed by the re-execution of the whole
application will fix this:

```js
function update()
{ 
    let post = get_post(window.state);
    let data = get_data(post, window.state);
    let processed = process_data(data, window.state);
    // ...
}
```

```html
<button onclick={() => {window.state.pressed = true; update(); }}>Click</button>
```

> I think it's important to keep this approach in mind.
> It's simple and predictable. At what point is it
> impractical?

> Hmmm actually I'm not sure about this either ...
> Looking at the pseudo-code above I see how the
> state is passed in to each function. What if you need
> some intermediate object that several parts use?
> Then you are once again orchestrating, even in
> a single-flow situation. I'll try write about this too.

## strange pieces

one way to think about this problem is through the user
interface: everything that can react, whether a button
or drop-down or mouse movement, does something. the
question is: what? for simple problems the answer
can be straight forward, like changing the color
or something, but as features are added to any software
it becomes a patch-work of parts that feed into one
another at different points.

- `button a`
** change the fetched data
** alter how the data is rendered
- `button b`
** change how the data is processed
- `slider`
** alter how the data is rendered

each of these interface elements need to be _orchestrated_ -
every one needs to be reacted to in a bespoke way.
which doesn't sound bad until you realise what happens
when one of your pieces changes: change your data
processing code and every one of your interfaces
elements that uses it will be affected.

## no architecture

again, it's tempting to think a disciplined architecture
can circumvent this: what if you ensure that the processed
data code always returns the same structure, for example,
even enforcing it with something like typescript - then you should
be able to change the internal code and it shouldn't
affect the code attached to each UI control.

the problem is understanding what happens, again, when
features are added: the structure will change. what happens
when you need to render something you weren't before?
it will have to end up in the data somewhere, which will
then have a knock-on effect on all the code attached
to the controls.

```js
function switch_clicked()
{
    let new_state = old_state + change;
    refetch_data(new_state);
    redo_processed_code(new_state);
    update_dom(new_state);
}
```

## existing solutions

the only one i know well because i used it in a project
is the reactivity in svelte. i have read about other
reactive solutions like rxjs, and the `auto` library
which is my solution to all this started as a kind
of mini clone of mobx (though i've never used mobx
in a major project).

there is also redux which i have watched videos about
and implemented small versions of. and of course react
and vue both attempt to solve this problem in various
ways and i still need to try build something complex
with these to be able to comment properly on how
they relate to this problem i'm describing.

even so, my instinct is that _orchestration_ affects
all of these since nobody has articulated it before.

## auto

`auto` is my solution to this, or at least an illustration
of solving the basic problem: making sure things happen
in the right order. and the solution i think is quite
elegant: have the entirety of your application logic
be enscribed as a list of variable names, each with
either a function or a value associated with them:

```js
let _ = auto({
    var1: null,
    var2: 'yes',
    var3: [1,2,3],
    var4: (_) => {/*...*/},
    var5: (_) => {/*...*/},
    var6: (_) => {/*...*/}
});
```

again, that's _everything_ - no part of your program
besides the view layer falls outside of this: fetching data,
transforming it, reactions to the ui.

the functions "represent" the names they're tied to:
you cannot change those values directly. and the ui
is tied to the static values e.g. `var1` or `var2`.
so

```html
<button onclick={() => _.var1 = true}>Click</button>
```

all the orchestration is done by the library behind
the scenes:

```js
let _ = auto({
    rows: 10,
    title: 'cats',
    data_000_raw: (_,set) => 
        fetch('https://cats.com/'+_.name,{_.rows})
        .then(res => json(res))
        .then(dat => set(dat))
        .catch(err => consol.trace(err)),
    data_001_parsed: (_) =>
        process_raw(_.data_000_raw)
});
```

```html
<button onclick={() => _.title='dogs'}>Fetch dogs</button>
```

all the ui can do is affect these static variables.
the library picks up which functions use these
variables and then updates everything in the correct
order.

not only do you not need to orchestrate execution
based off your UI components, you don't need to
orchestrate _anything_ - you just write functions
with their dependent variables and then forget about
them.

## isn't auto just reactivity like mobx or svelte?

mobx and svelte, for example, have a feature set
that _covers_ that of `auto` but they allow far
more which is fatal to their comparitive usability -
they allow for multiple paths of entry for dynamic
variables.

an example in the case of both mobx and svelte
are the autorun blocks, `autorun` in mobx and `$:{}`
in svelte. these are blocks of code which re-run
any time one of the variables inside changes.

```js
// --- mobx ---

let x = box(1);
let y = box(2);
let z = box(0);

autorun(() => {
    z = x * y; // z will be assigned 2
})

x = 10; // z will be assigned 20

// --- svelte ---

let x = 1, y = 2, z = 3;

$: {
    z = x * y; // same as above
}

x = 10; // same as above

```

this seems fine until you realise you can
have several of these blocks, each
updating variables which affects other
blocks.

> take it from someone who has _been through things_ -
> don't use auto execution code blocks unless you
> like to suffer for years and years terrified of
> touching and breaking the same simple code base!

```js
autorun( () => { z = x * y });
autorun( () => { x = y * 2 });
autorun( () => { x = z * z }); // this will actually cause a circular dependency error but hopefully you get the point
```

## one function per variable

the solution is simple: have a one-variable-to-one-reactive-function
rule. you can do this with mobx and svelte:
they are both variable-access aware and know how to
update things in the right order. just make sure
that there is only _one_ point of update for each
variable!

this will require some discipline, specifically with
the UI access: you need to ensure the variables
the UI touches have no functions associated with them,
otherwise you now have multiple points of access -
one functional and now others from the UI.

`auto` enforces this by design: each variable is just a name
and each dynamic variable has just one function associated
with it so you can't have more. these functions are not
allowed to touch anything else or an error is thrown.
and you cannot access them from the outside either.

## what does it look like in practise

this is the `state.js` file for the
[charting example](https://github.com/kewp/auto-charts) i
created.

> the code might have changed since i pasted it here

```js
// todo :|
```

even though a lot of the logic is inside separate
files what we see here is the all the _wiring_ between
every primary component of the app:
the source data, the UI indicators, the switches and buttons,
and each stage of pieces that make up the drawn elements.