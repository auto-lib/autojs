
# functions

why can't i have functions that set values?
why must everything be a piece of state?

right now everything in auto is a value,
a single value. and we define functions
that calculate those values.

what what if i have a button
that i click on
and i want to go through a bunch of logic
to decide what the button must do?
how is that encoded
using this ... state-function relationship?

what have i actually done in auto?
what ... is it?

```js
{
    'name': value,
    'name': value,
    'name': () => function
    'name': () => function
}
```

so that assumption is that everything is a value.
we ... are building up
state. really it's just about state. it's ...
about values.

and the idea, really, is that it's better
to build up values with functions
rather that with steps - that values shouldn't
be these boxes that anyone can modify.
that if you have a single access path
then your code becomes much simpler
and better, easier to reason about,
clearer pathways, less errors, easy
to do other cool things, etc etc ...

but a lot of the time it feels awkward.
particularly with events, like clicking on
buttons. that has sucked. i end of creating
a variable called `ui_name` and then set that
and then the logic goes further down ...

what ... what is auto? automatic variables.
function variables. what is clicking on a button?

why can't i just put this logic outside
the state?

well, it would be nice to ... have the function
itself be reactive:

```js
{
    select_dataset: _ => nickname => {
        _.ui_name = nickname;
    }
}
```

then i can ... have the function change
based on whatever conditions there are
in the global state.

in a way this is quite interesting:
instead of having the function
take in parameters
i can use the global state
and then a new function is generated
whenever the relevant variables change...

again, though, how do i ...
connect with ...

i mean, why is there logic
to generate this function
when i can just say "this is how you
select the dataset based on the nickname" ?

i want to find out what abstraction
i need to add, the one step out i need to do,
that will allow me to capture the state-function
thing cleanly and now still allow for some
outside thing ... for an event.

```
amount | sync    | async
-----------------------------
one    | get/set | subscribe
many   | iterate | observable
```

hmm...

ok so clicking... what is a click?
it's not a variable... it's not really state.
sure you can model it that way, but really
it's an event - it's something that needs
to be dealt with. and you can have many of them.
and each one you have to deal with separately ...

ok, let's say we have ... something that captures
events. and the event has a name and some data,
a payload. and each payload has a handler of some kind...

> i really like the callbag library. terrible name though.

ok. we have that. some abstraction to codify events.
now ... how do we connect that with our auto object?

```js
{
    'name': value,
    'name': value,
    'name': () => function,
    'name': () => function
}
```

why are the two incompatible?

well for one thing the auto object is essentially
declarative: it's saying "this value is equal to
this and this combined in this way". where-as an
event is not a value we are trying to calculate...

---

