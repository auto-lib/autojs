# on the proximate cause of complexity in interactive online systems and it's solution

## abstract

software that is both interactive and event
based such as web and mobile applications
present a unique challenge in managing
complexity as ajax calls, interactions, data
processing and the interface are both tightly
coupled and subject to rapidly changing
features and requirements.

this paper asserts this problem stems from a single
cause that we here dub _orchestration_
which is the project-specific code
ensuring distinct parts of an unpredictable
system run in the correct sequence. we describe
and motivate this claim with a toy project
and then show how orchestration can
be done away with completely using a kind of restricted
reactivity which uses global state
and a policy of one update function per variable
and for which an implemention is presented in a javascript
library called _auto_.

## background

web and mobile applications have proliferated since the
advent of the internet. as such there has been a ground
swell of development around how to they are created.

of approaches to their development.
they are distinct from their
desktop forebears in the amount of unpredictable external
influences they need to respond to in the form of
server requests and multivariate user interaction.

## interactivity

it's important to note that the reason interactivity
causes an issue is because of uncertain timing.
we have something that could occur at any time
and so we cannot know the conditions under which it
will occur. this makes architecting a system
simply more challenging than if we were writing
a program that just did processing, as a large
majority of operating systems, say, do - all most
of unix does is take some input and produce output.
the input is unpredictable but comes from one
source - either up front you can make sure it fits
your ...

> i'm starting to wonder whether this does in fact
> apply to more than just 'event systems' or
> web-based, interactive stuff ... as though this
> could be ... in the example below, the three
> body problem, what happens if i take away the
> interactivity part and replace it with another
> data processing step. in fact, let's just have
> three data processing steps. what does using
> a variable-function relationship achieve?

> perhaps i should call this article 'solving the
> red and blue problem' even though i feel as
> though the solution here is more interesting
> than just that.

> i think maybe i'll just mention the red and
> blue thing in the abstract. yes - this solves
> that but it seems to be a spine you can pin
> all software around.

## the three body problem

imagine a piece of software comprised of three
components

> i think this is really about 'unpredictability
> as the proximate cause of software complexity' ...

1. process `a`
2. process `b`
3. process `c`

first we encapsulate them as functions

> why functions?

```js
let process_a = () => { /* ... */ }
let process_b = () => { /* ... */ }
let process_c = () => { /* ... */ }
```

> i'm using es6 arrow function format here

and specify that each only operates on
some variable which we'll call `data`.

> eventually we will convert this into a basic web
> application by having `a` be a server request,
> `b` be a browser ui update and `c` being
> the handling of user interaction from this ui,
> but it's illustrative to start with simple data
> processing

we can think of two broad ways in which these
processes both handle `data` and connect with one another
which i'll call _global_ and _local_.

_global_ is just having `data` be a global variable
and which each function can then read/write to internally

```js
let data = null;
let process_a = () => { data = 10; }
let process_b = () => { data += 1; }
let process_c = () => { data *= 2; }
```

_local_ is having the components (functions)
return values

```js
let process_a = (data) => 10;
let process_b = (data) => data += 1;
let process_c = (data) => data *= 1;
```

> in es6 `=> expression` without curly
> brackets evaluates and returns `expression`
> where-as with curly brackets (e.g. `{ data = 10; }`)
> nothing is returned without an explicit `return` statement.


## preface marker

orchestration is ensuring
each part of your software is connected correctly. it is a major
part of software complexity and is in many cases,
as i'll show here, completely automateable.

## three body problem

to illustrate let's design a simple app
comprising three pieces called

1. produce data
2. display data
3. handle user interaction

for now let's say `1.` just does a simple calculation
(later on we'll look at asynchronous calls that introduce
additional complications to be discussed separately).
as we'll do this in a browser `2.` will simply modify the dom.
and then for `3.` we'll have a drop-down, say, that modifies
the inputs to `1.` in some way.

let's write these out as functions

> i'm using slightly reduced (without `let`) ES6 arrow functions if you
> haven't seen them before

```js
produce_data = () => /* return x times 20 */
display_data = () => /* innerHTML = something */
handle_inter = () => /* modify x */
```

we need to specify how these connect, that is, a) 
how will they pass values to each other, and b) 
how do we ensure they execute in the correct
order.

### communication

let's say `1.` produces something, call it simply `data`,
`2.` uses this, and `3.` triggers `1.` which in turn
produces a new, different `data`.

- `1.` produces `data`
- `2.` consumes `data`
- `3.` triggers `1.`

as is typical let's encapsulate the parts as
functions in code

```js
/* 1 */ produce_data = () => { /* ... */ }
/* 2 */ display_data = () => { /* ... */ }
/* 3 */ handle_inter = () => { /* ... */ }
```

> I'm using simplified ES6 arrow format here
> just because it's terse

here `user_inter` is a function called by the
interface when some interaction occurs,
for example when clicking a button

```html
<button onclick={user_inter()}>Click me</button>
```

how do we ensure the rules we chose? for this we
need to both connect outputs (here `data`)
and to somehow ensure functions are run in the
correct sequence.

### 1 of 2 - connecting functions

broadly there are two approaches for this (though
they can and are very often mixed). i'll call
them _global_ and _local_.

in the global approach one or many variables outside
the functions are used as communication waypoints

```js
data = null;
fetch_data = () => { data = /* ... */ }
update_dom = () => { /* use 'data' */ }
```

in the local functions communicate with each
other directly forgoing the need for an
external intermediary

```js
fetch_data = () => {
    data = /* ... */
    update_dom(data)
}
update_dom = (data) => { /* use 'data' */ }
```

each has advantages and disadvantages as we'll see

### 2 of 2 - running correct sequence

the most obvious way to ensure everything happens
in the right order is just to have them call each
other at the right time. this looks slightly different
depending on how we connected them.

for global:

```js
data = null;
fetch_data = () => { 
    data = /* ... */ 
    update_dom()
}
update_dom = () => { /* use 'data' */ }
user_inter = () => { fetch_data() }
```

we've done most of it already for local, we just need
to add the user interaction:

```js
fetch_data = () => {
    data = /* ... */
    update_dom(data)
}
update_dom = (data) => { /* use 'data' */ }
user_inter = () => { fetch_data() }
```

> presumably different `data` is produced each time
> you interact with the ui, either in `fetch_data`
> (maybe it's time based) or perhaps `user_inter`
> passes something into the fetch as an argument.

the only thing left to have this be realistic is
to have it boot up correctly. here that just means
running `fetch_data` once. regardless if you've
used local or global it looks like

```js
fetch_data = /* ... */
update_dom = /* ... */
user_inter = /* ... */
fetch_data()
```

## demo

for clarity i include here a complete working
example in the form of html. i'm using the
global approach but it should be trivial to
change to local.

> to test it, save to a file like `demo.html`
> and then either open with a browser or
> serve locally with something like `npx http-server`
> (`npx` is part of [npm](npmjs.org))

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>orchestration demo</title>
</head>
<body>
  <div id="target"></div>
  <button onclick={user_inter()}>Click me</button>
  <script>
    let data = null;
    let fetch_data = () => {
        data = Math.random();
        update_dom();
    }
    let update_dom = () => {
        document.getElementById('target').innerHTML = `${data}`
    }
    let user_inter = () => {
        fetch_data();
    }
    fetch_data();
  </script>
</body>
</html>
```

> this example is a bit contrived: `fetch_data` doesn't
> actually fetch data, it just returns a random number.
> and `user_inter` is essentially pointless since it
> just calls `fetch_data` (so we could have just called
> `fetch_data` directly from the button). but in a more
> complex scenario the user interaction would contain
> data (like which drop-down was selected), and fetching
> data would take that in to produce it's result (perhaps
> calling the server differently)

## issues abound



## old readme (second preface)

this may seem straight forward but
there are various complications:

- each stage needs the results of the previous ones
- nothing stops you from executing the subsequent linking calls at the beginning, end, once or multiple times
- nothing also stops you from calling other functions too, in whichever order you want

each issue is serious. take the first, of which there
are two general approaches: one ('state') or many ('globals')
variables outside:

```js
data = null;
fetch_data = () => {
    /* set data */
    update_dom();
}
update_dom = () => {
    /* use data */
}
```

or by using parameters i.e. variables inside the functions

```js
fetch_data = () => {
    data = /* ... */
    update_dom(data);
}
update_dom = (data) => {
    /* use data */
}
```

and with each a litany of potential problems arise,
again. in the global case:

- one or several other functions could change `data`
- if you change the structure of `data` you have to change all the functions that touch it
- `fetch_data` and `update_dom` are tightly linked in practise but loosely linked in implementation (i.e. with function calls)

> arguably the global case is how software started -
> everything was global with punch cards (i'm assuming)
> and with assembly. the local (parameter) case was
> a step up, and with good reason: less chance of
> screw-ups with all that outside access. strange how
> we are going back to global access in web apps now.

in the local (parameter) solves a lot of the global issues
but still has problems such as:

- if multiple functions use `update_dom` then multiple functions must know how to generate `data` correctly

it gets deeper, though: what happens if your user interaction logic needs to know
something about `data` - where would it get it from?

```js
fetch_data = () => {
    data = /* ... */
    update_dom(data);
}
update_dom = (data) => {
    /* use data */
}
user_interact = () => {
    /* use data - from where ??? */
    fetch_data();
}
```

you have to store the at least part of `data` outside
the functions.

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