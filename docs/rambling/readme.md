
## rambling

not sure which file to put this in.
but upon needing to generate lists
of objects i'm wondering whether it
isn't worth re-packaging this library
as 'generative state' or some such.

> i'd like to avoid the word 'state'
> though it's understandable to
> the javascript community

my goal in all of this is to produce
something that had i come across it
years ago when i started this charting
project i would have been like "oh
this looks interesting" and then been
like "oh wow this is very cool" and
then would have used it and it would
have actually been exactly what i
needed and have made making the app
a joy.

so ... what would i be saying to
myself? what would i have to explain
about ... writing complex interactive
applications to make me understand
_why_ i needed a completely new way
of writing software? i mean, why
not just have a bunch of functions,
and a bunch of state hanging out
everywhere ... why not?

maybe this is all about unidirectionality?
i mean, why did react decide to make
the ui a pure function?

ok, how about 'sequence-free software'.
that's a bold statement. sequence-free
_state_ maybe a bit less intimidating.
and _software_ sounds like a company.
and it is really _software_? well, yes -
it you base everything on the state,
which i think might be the right idea.

ok - one thing to notice is that no-where
in an auto wrap is there a conditional
statement - it's all just variable:function.
and also, the only variables that are
used are other variables inside itself.
and it can't affect those variables.

this is a real ramble.

ok so another thing: each variable only
has one function which can affect it.
that is the same as react - perhaps it's
not the fact that it's a pure function
but rather that it's _one_ function.
pure, yes - it gives the same result
with the same input (the 'state').

ok, i think this might be it: what if
the state is deterministic? that is:
each state change happens with a
state change ... so in react we use
the state to produce something, the
ui. erm... too much coffee.

'pure self-referential only-base-one-itself
singular-path state'

look - the point behind auto is that
each part of the state is determined
deterministically based on parts of
the other state, defined directly.
which is much like the literature on
reactive programming:

- `x = 10`
- `y = x*2`
- `z = radius(x,y)`

that really is it. it's just like
mobx but crucially variable
values can only be assigned to
_once_.

ok ok ok... how about this:

- functions do one thing: determine a _single_ variable's value

perhaps this is all about functions...
saying that you should not have generic functions:

```js
let do_stuff = () => {

    global.x = 10; // boo

}
```

right, so this is just 'pure' functions, fine.
but what is different is - how is the global
state defined? well ... you have to have
some access to it and you set it inside a
function!

"state determined only by one function"

let me try to break it down into parts.
let's say you say "ok, so for our global
state we have one function which determines
it's value" and you do it literally:

```js
let state = {}; // global state

let update_y = (state) => { state.y = state.x * 2; }
let update_z = (state) => { state.z = radius(state.x, state.y); }
```

firstly, why do this? well because imagine this
_wasn't_ the case: how would you ever know
why a part of your state was the way it was?
there **must** be a way to name this, to describe
it. it's immediately apparent and obvious and yet...
i can't find a term for it. basically ... if you
have multiple places in your code which have access
to the same global variable (and surely all 'state'
in javascript lingo is global...) then you will
always be doing a crazy dance each time you try
to understand why that value was the value it was...

i mean, something breaks in your code with `'charts' is undefined`.
ok - why is `charts` undefined? well, let's look at all the
places which set chart ... hmmm ...

i mean, how would you even _do_ that? a global text search
for `charts =`? would that even work?

instead of this, imagine each state variable had only
_one_ function which determined it's value. and for
these function-based variables they _cannot be set from the outside_.
then you would _know_ - ok, so the undefined **must** be coming
from this function!

how about this for a tag-line for the auto library:
debuggable state. ? it's good but i'm not sure it
would have captured my imagination had i been the
one to come across it on github... but it's true:
i could base this _all_ around just that: your javascript
code breaks because of an undefined value. what are you
going to do? it's actually a great idea, even for the hero
page. "what do you do when it's undefined?". another tag-line
perhaps is 'no longer afraid of undefined'. though, again,
only someone who had tried to make a complex app would even
know to be intruiged by this...

so what would one say to past me about this issue, in a sentence
what would one say... well "you can't tell why things break".
but even that doesn't strike the bulls-eye - when i first
started out i had no concept that things were going to break.
all i knew is that there were a bunch of relationships and
it all made sense to me that this was going to be straight
forward, or that it _should_ be straight forward. i need to
speak to that person, and then perhaps somewhere on the hero
page mention that, oh by way the way - this is totally not
how it is with other solutions: things break and you have no
idea why and you can't figure out why and your life is a
nightmare and you live in fear that what you have done for
work is going to fall apart randomly.

i think 'declarative state' might have turned my head back
then. also, it takes us away from 'reactivity' which i'm
starting to feel is besides the point. and it acknowledges
up front that this is, well, declarative programming instead
of imperative. it's good, i like it for now.

somewhere in there i can answer the question "isn't this
basically like mobx?" and i can say "yes it really is.
except we don't allow _side effects_ or autorun blocks,
i.e. the focus isn't on reactivity but creating an
function-defined state

## auto - declarative state

**auto** is a javascript library for constructing state
without control flow.

### two kinds of state

in **auto** there are two kinds of state: a value or a function.
_values_ can be set while _functions_ cannot. this is
specified using an object:

```js
var obj = {
    variable1: [1,2,3],
    variable2: 'string',
    variable3: null,
    variable4: ($) => $.variable1.map(x => 2*x),
    variable5: ($) => $.variable4.map(x => x + 1)
}
```

here `variable4` and `variable5` are both functions.
hence they cannot be set directly: if you try
**auto** will throw an error. also notice that
function variables can be used as inputs to other
functions.

### how it works

this is done in one go by wrapping some object with
the **auto** keyword:

```js
var $ = auto(obj); // this is the beginning and the end of using auto
```

## declarative state vs mobx

mobx really is exactly like what i'm doing here.
in fact it can do more, it's more developed. it
allows you to construct derived values, which really
is what i'm trying to do. however, this focus i
think is good / has potential: where-as mobx is
focused on being _reactive_ i... don't think that's
what i need in this case. reactivity is close to
what i need, or it _covers_ it in a way ... but
not really, it's too general. it's not reactivity
that is the heart of the point - the point is
managing the state. automatic state. hmmm that
might be even better. it matches the library
name.

the point is, though, to have the library focused
on building out a state object and being able
to investigate it. it's not a tool that you can
weave into your program. rather it's a completely
separate thing that you tie your program into.

the different is between "do this automatically
when this changes" and "this variable is build
like this".

> building state automatically

the idea is: using functions, declare how a piece
of state should look like. so how can you ...
like let's start with a way you would _like_ your
state to look:

```js
var state = {
    charts: [
        {
            dataset: 'string',
            points: [
                {
                    date: /* ... */,
                    y,
                }
            ],
            values: []
        }
    ]
}
```

so, and this is good: like with the react tutorial
you start out by describing in a hard-coded way
what you want your state to look like. and then
you use **auto** to build this out. describe your
state using maps, filters, lists, objects and functions.

```js
let $ = auto({
    names: null,
    'charts[names]': (name,i) => {
        dataset: name,
        points: ($) => getPoints(name),
        values: ($) => getValues($.charts[i].points),
    }
})
```

using a variable name like `charts[name]` tells
**auto** "i want to create a variable called `charts`
that is a map over a variable called `name`. so in fact
`charts` is an array, and an array of objects because
we are returning an object.

however, what does the object look like? well we have
declaratively design the object based on two things:
functions, and other variables in the state. here `$`
for the functions is the state variable so you can access
any of the variables here as seen in `$.charts[i].point`
in which case we are referring to the previously
constructed variable (since a map returns the index in
the second parameter i.e. `i`).

what about doing the map ourselves?

```js
let $ = auto({
    names: null,
    charts: ($) => $.names.map( (name,i) => ({
        dataset: name,
        points: () => getPoints(name),
        values: () => getValues($.charts[i].points)
    }))
})
```

here is a real example:

```js
let $ = auto({
    data: [
        { name: 'one', points: [1,2,3,4,5] },
        { name: 'two', points: [4,5,6,7,8] }
    ],
    a: 0, b: 5,
    names: ['one'],
    charts: ($) => $.names.map( (name,i) => ({
        dataset: name,
        points: () => data[name].points,
        values: () => $.charts[i].points.filter(p => a > p > b)
    }))
})
```

this should work. a few points:

 - it would be worth creating a web front-end where you can put these objects in and the inspect the results
 - the trouble here is that we are returning an object. but it's not that bad:
   we could just get **auto** to examine the results of any returned object,
   and if it is a function then we take it as an auto-variable... (i like that term! perhaps against 'plain
   variable' for the other type).
 - how does this relate to the ordinary i.e. imperative approach? why is this useful? would be worth writing
   out how one would do this with functions and updates ...
 - also, what are the implications with how auto works: is it simply "any variable which is a function is
   assumed to be an auto-variable, including when an object is returned". that's nice, it doesn't seem
   complicated.
 - does that cover everything one might want to build? arrays, objects ... strings, numbers ...

let's go through this example again.

 - how hard would it be to construct the `charts` variable ordinarily?

ok, so we have 4 variables we care about: `data`, `a` and `b`, and `names`.

```js
let state = {
    data: /* ... */,
    a:0, b:5,
    names: ['one']
}
```

so this is global state. now we want to construct the charts object:

```js
let charts = (state) => state.names.map( name, {

    dataset: name,
    points: data[name].points,
    values: /* ??? */
})
```

nearly there. the only issue is we don't have access to the `points`
variable of the current object. but let's ignore that for now.
we have a single function which updates `charts`. so we just say

```js
state.charts = charts(state);
```

at some point. and here is the problem: _when_ ? when should we do this?
well

1. when `a` or `b` changes
2. when `data` changes
3. when `names` changes

so any time you add to the `names` list you need to remember to run
`state.charts = charts(state);`. that's fine. one point, though:

 - you have to re-generate the entire list of charts even if only
   part of it changes.

that's fine i suppose.

> in fact, the entire reason for the library could be seen as a caching
> solution. why not have the whole state be one function? which is
> interesting, because that is how react works ... just one function
> to generate everything and then diff. but here, interestingly, we
> don't _build_ the state since the structure is there already. we
> don't string together dot access `.` and loops and local variables.

## class exercise

what about an article that says "here is your homework task: create
an app that constructs the data you need to draw a chart. here are
the constraints: you start with all the data. you have a variable
which holds a list of the charts to draw. you have a function
which converts the data to a list of x and y values. and you want
to have a window of values to draw."

part of this is to show how tricky it is to update things when they
need ... not sure if this exercise shows this ... but another is to
show how difficult it is to keep re-writing everything...

how about `generative state` ?

## another perspective

ok what about looking at it in term of this: generating state.
what are the ways you can generate state? is that the right way
to see it - are there distinctive ways? there two i can think of
are - imperative and declarative... hmmm ...

you can have a _procedure_ ... no, that's not it.

you can have a list of statements which may or may not affect
the state ... or  you can have a list of procedures which
you _know_ will effect _one particular part of the state_.

ok that might be the way to go: software is a list of statements.
however, what makes software _complex_ or... _debuggable_ ...
what makes it _intertwined_ or impossible to trace ... hard to
follow?

statements ... software is a list of statements. we need statements
in our lives ...

is it not simply being able to trace the causal / cause of a variable -
what _caused_ this variable to be this way? is that not simply it:
to have either _one thing_ which caused it, or many? if you have
a global state then you are screwed, essentially. because you don't
know what changed it or when.

generative state, why? you only have one piece of code which determines
what a part of the state is. and not only that, the variables
that are inputted into this piece of code have triggers attached to
them so that this piece of state has this piece of code run
whenever these variables change. so what does this mean? it means
that it's locked down temporaly as well. time and space. there is
only one place where the variable can be changed from. and there
is only one time where it can change from? space and time, people.

you want to write software? to make a computer behave in a predictable
fasion? then modify global state from several places in your code!
then have other parts of your code depend on that, from several
places too! it'll be so amazing, you will love it. really. trying
to figure out how just one tiny variable is the value it is will
be an adventure like you've never been on before. hours and hours
of searching, pausing, printing, ripping out, testing, tweaking.
and when all seems to finally be behaving correctly you will have
zero confidence that it will stay that way. everything will be so
exciting! at no point will you ever know whether the actual logic
of your code matches the rules you have tried to impose on it.
wicked!

> still loving `generative state`. i think it's good.

but how, karl, how? what is state? how do you make it generative?
what about deep objects? what does it all mean?

where and when, people. _where_ is this piece of state being
changes from (answer for auto: just one place), and _when_
is it being updated (answer for auto: when the variables
that determine it change i.e. whenever it needs to). where-as
the normal situation for when is - well, who knows. could be
now. could be never. _you have to manage it_.

## auto - generative state

auto is a javascript library for dynamically maintaining state
in terms of functions.

### why

tracking variable changes is essential in debugging programs.
this comes down to two questions: where did the change come
from and when did it occur. with generative states these
answers are straight forward: they happen where the generative
function is defined (<link> these variables cannot be set from anywhere
else) and they happen when their dependent variables change
(these changes are detected automatically). thus the task of
understanding variable changes is greatly reduced.

### how

an object is passed into a function called `auto` with some member
variables (including those nested deeply) containing functions:

```js
let $ = auto({
    data: [1,2,3],
    sets: ($) => $.data.forEach( item => ({
        number: item,
        name: ($) => get_name(item)
    }))
})
```
