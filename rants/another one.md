
what am i trying to solve?

- styling
- if block
- global state
- local state
- ui events
- html?

is there a system
which would make using this
in a complex application
easy to navigate?

what is the process i want to follow
when an issue / need arises?

1. i want to change the background colour of a component

where do i go?

2. i want to change the padding on an element

where do i go?

3. i want to change the behaviour of a button

where do i go?

is there a clear way to ensure that

- i can easily find the code responsible
- i can easily change the code without feeling scared i'll break something else

and really, what i want is to be able to switch features on and off. this is almost the _whole point_ - every feature is just a toggle ... is that feasible?

what would a system look like
that was made up of
a set of switches ?

perhaps it's a hierarchy of switches,
so you can have a feature called
'search box'
but then that feature also has
switches like
'dark' or 'small' ?

and how could you have these
all work with one another?

every feature of the software
would have to somehow automatically
interact correctly
just by switching one thing on or off.

what might that look like?
software is defined by it's need
to be meticulously orchestrated.
how could you design software
that needn't be orchestrated at all
while at the same time
retained it's flexibility?

i guess auto was a step in this
direction - by tieing all computation
around variable names
one could easily switch
between different features
seemlessly, since the system itself
determined the execution paths
based on automatically determined
relationships between variables.

is there a way to extend this
to things like creating user interfaces?
what is the distinction?

of course we do have something like
this in place already - in all current
ui libraries you can just place
an 'if' statement around blocks of
your declarative ui to decide
what it should look like:

```svelte
{#if x}
    <div>hello</div>
{:else}
    <div>there</div>
{/if}
```

except the problem here
is that what is inside of these
if blocks is typically
many other components -
everything is tightly integrated
so that for any switch in feature
you have to rewrite everything

```svelte
{#if x}
    <ComponentOne />
{:else}
    <ComponentTwo />
{/if}
```

what is different here?

what if i want to
lay things out differently,
what if that is my
'feature switch'?

```svelte
{#if feature_one}
    <div>
        <div><ComponentOne />
        <div><ComponentTwo />
    </div>
{:else}
    <div><ComponentTwo />
    <div><ComponentOne />
{/if}
```

and what about the parent of
this aforementioned code - surely
it needs to know what is happening
in the child in order to, say,
lay things out correctly?

in the code instance, i.e. auto,
it is easy to isolate things -
all you need are variables in
and a variable out (variables?).

with ui that is not so easily.
the assumption has always been
that you split things up into
their visual parts, but is that
correct? every part has a relationship
to others, typically a parent,
but often a window as well.
because of this you can't
focus on the component itself
without incurring issues around
the component (or within it's own
children as well).

what is causing this?
how is this fundamentally different
from the auto objects?

the real problem here is one i think
may be the central issue in designing
software, perhaps the central issue in
managing any system of interacting parts - 
being able to reliably isolate the
effects of any part on another.

with auto we are essentially taking all
the code and isolating it's effects - 
all any piece of code can do is to
change the value of one variable.

and not only that - that is the only
thing one can do, to write code that
will change the value of one variable.
you construct the entire system as
a collection of software blocks.
and each block is naturally isolated
from one another through this very
small filter, perhaps the smallest
filter there is - a single value.

i don't know if this really is the
ultimate way of thinking about software
and software systems, but perhaps
it is - that you split everything
into parts and find some way to
control the effects each part has
on the others.

of course parts must have effects.
but that, i'm positing, is the
essence of the complexity, which is
to say the essence of how difficult
it is to use, how easily it can be
scaled, the limits of what can be
done ... everything hinges on this
one notion, complexity, or rather,
how to manage the dependencies
of things - what happens when you
change something? how do effects
propogate? if you look at the system,
what do you need to understand in
order to be able to reason about it?

what does it take to reason about
it correctly?

---

everything should produce something.

the problem with functions is they
do not produce something, they are used
somewhere for some purpose, who knows
what.

when you look at a function you have
_no idea_ what it will be used for,
where it will be used, and for what
purpose.

don't we need functions
in order to reason about code?

no - i think everything should be
there to produce something - everything
that is happening in your program
has a source, and the whole program
should be built starting from that
source and working backwards. so
everything you see on screen,
every effect you see, every occurance
has it's roots in the root of your
source code - there is a 'Button' file,
a 'Sound' file, a 'Request' file.

software is normally built with the
effects at the end - we build towards
what we want, like a recipe. but this
is a pure abstraction, and we are bad
at holding multiple steps in our
minds, and what we want to reason about,
always, are the _effects_ our software
produces.

every piece of software should produce
something. you could have a piece of
software which produces a button. then
another which produces a list.

"don't functions produce something?

not in the program itself. they are a tool
used to compose things together in the
hopes of producing something. which is
wrong. we want to get away from
orchestrating the program, as much as
possible, from the very outside down
into the details as much as possible - 
let the software decide how to string
things together and make sure they work
in consort.

---

the thing i love about auto
is that every wires together automatically.

i'm struggling to see how that can be
done in a more general way. it works for
a lot of computation and design but
seems to fall apart for others, like
async, like events. which is weird
because the new version of the library
is built on a message queue.

---

with auto you only choose one thing - the
name (of the function/variable).

what is great about that is ... well you
do not have to figure out how to plug
the function into the program.

and this is what i want - to not have to
figure out how to plug _anything_ into
your system.

i suppose the real point is not to have
a particular system for ... i dunno, specifying
the 'shape' of the component (function?),
but rather just that you needn't say 'this
goes here', which is how things are typically
built (in fact i can't think of a single
case where ... this is not the case - you 
always need to say two things. 1. what is
the shape, and 2. where does it go).

like lego.

but what if the lego blocks were self-assembling?

again, this sounds insane - how would this work?

but it does work, just look at auto. the entire
system is literally a collection of name-function
pairs.

it's not perfect. i'm struggling to get it to
work elegantly with building a user interface.
hence this rant - what am i missing; is there
a similar approach which is more flexible;
what is the underlying principal ...

yeah, i like the idea ... i like the notion
that the whole point, the thing that makes this
a huge step, is this idea that you needn't have
both things: you needn't have to specify both
shape and assemblage. that is not necessary ...

it's kind of an amazing idea - imagine the universe
was like this - that if you want to build a car
you just specify the parts but not how to put
them together ... imagine that is how the universe
worked ... that two parts fitting together in
a particular way was ... well specified by, what?

i mean, in auto it's specified in the function
body:

```js
auto({
    x: 10,
    y: _ => _.x * 2,
    z: _ => _.x + _.y
})
```

which is odd - we do specify how things are
assembled, but we _wrap_ it ......

---

so really what i want is not just sequence-free
software but _construction free software_.

what ... would we need in order for that ...
what is the requirement of a system to
be 'construction free' ?

