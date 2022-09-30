# all in one

i decided to write down everything i want from this library
so that i can try figure out a way to, well, have it all.

## the list

turns out it's a long list.

- components
- style options
- auto layout
- inputs/outputs/actions
- testing
- value mapping
- channels
- ui errors
- remote error reporting
- fuzzing ui
- check functions
- custom dom lib (jsx)
- layers
- vite integration (no imports)
- vs code integration (live error reporting)
- svg-based editor

### components

i want to be able to split the program into
parts, each completely separable i.e. not
dependant on the program you are writing
(not coupled).

### style options

each component must be able to toggle through
different styles (ui components).

### auto layout

components must place themselves correctly
layed out into different contexts

### inputs/outputs/direct modification

each component must be able to specify
what values it needs, what values it
exports to the outside world, and what
values it will change in the outside
world.

### testing

each component must be separately
testable, specifying inputs and
actions and the subsequent expected
outputs.

### value mapping

we should be able to map inputs/outputs/actions
to different names in order to have
components work in different environments

### channels

each component can be attached to a number
of channels, each one specifying inputs/outputs/actions.

> this is less of a want than
> what i already feel is the
> way to achieve the design goals ...
> though perhaps there is another way?

### ui errors

we need to have some way of indicating
issues on the ui, both globally (like
a toast notification) or locally i.e.
an exclamation inside the component.

what kind of issues are there? network
issues, code failures (exceptions caught),
check failures ... we need to have ...
it would be amazing to have some kind
of generic ... thing that says 'ok
we are attached to a ui so that is
how we are going to report on this
stuff' and have this be truly generic - 
it just works with all components.
and then to have options of action
be generic as well - explore the program
state, perhaps roll back to a previous
version of the component / program...

it sounds insane but imagine if we
pulled this off.

of course the non-ui components will
have to show themselves in the
toast overlay.

perhaps we should have console
access too - you open up the js
console and can interact with the
program there.

### remote error reporting

if an error occurs we need to
connect to a remote service
and send the error with all
the state and history we need
to reproduce the error.

this connects to the following
want:

### remote error ui server

we should have a server
that you can log into and
see all the errors that
have occured, click on
them and explore the
state / reproduce the ui / 
step through all the actions
that led to it. perhaps
even fix there errors right
there and commit ... (!)

### fuzzing ui

we must have some automated
process that takes the latest
version of your program and
tries to hammer it randomly
trying to break it.

this is why we have to define
each possible ui interaction
formally (i call them actions
right now) so that we can
have an automated way of
just randomly interacting
with your program.

this should probably tie
into the above remote ui
server...

### check functions

we need to have functions
that are run and return
true / false (or perhaps
run an error function?) 
so that we can say things
like 'this value should
always be non-zero' or 'this
value should always be
an integer'.

struggling to figure out
the best way to implement
this, probably with a ui
as well and also comments
on each one so you can
explain yourself?

### custom dom lib (jsx)

i want to replace svelte
with a new ui lib that
converts jsx into update
functions.

might even be worth having
components be written
in a kind of jsx since
you have to ... see the next
section

### layers

this is more the answer to
all of these things but
i think is the best idea
i've had so far.

each thing is made up of
other things, and each 'thing'
have inputs/outputs/actions.

so it's a component, sure ...
but you take a bunch of
components and it makes another ...
component.

so i don't like the word
component anymore. unit?

### vite integration (no imports - flat namespace)

i don't want imports at the top
of each code file. i want everything
to have a flat namespace - if you
have a file name `thing.js` then
`thing` is on the global namespace.

why on earth this is not the standard
i don't know - why would you have
multiple things with the same name?

code sharing, sure - if you pull in
another library (like one you wrote
before). if so then, ok, we write
at the top 'this path maps to this
namespace'. but that is the exception!
why on earth have people been writing
these massive imports since the beginning
of programming!

perhaps i'll find out when i do this.

but the idea is just - you specify
a base path somehow and every file
with a particular extension in that
path (recursively) is added to the
namespace...

### vs code integration

i want vs code to tell you when
things don't line up, the inputs/outputs/actions.

### svg-based editor

i want to be able to see all the
parts / units and how they work
together, perhaps even step through
actions / tests.

i suppose this should be part of
the other ui tasks - remote errors
and tests.

## how?

there are certain things we have to have.
the first is a server. we want to be
able to access a url with a browser
so there has to be something that accepts
connections to port 80 and then sends
back html etc.

what else do we know we have to have?

weirdly i think that's all we actually need.
there is plenty of other stuff we could build.
but just to view and develop an app?
the only other thing is being able to save it,
to persist it in some way. though the server
could in theory just allow you to download
what you've done in some form ... as a zip,
as an image (why not?).

ok so apparently we can just do this with
a server, one server. then we have to talk
about what that server has to be.

we know it has to accept connections, tcp
connections, on port 80. and it has to
be able to parse http, presumably. or
we could just send through the same thing
each time ...

i mean, if we want things to persist then
that is not going to work. we have to ...
the server has to have some mechanism for
saving state.

ok so the server has state. and processes.
could we write it using this auto framework?

and we want to view the auto framework,
interrogate it ...

accept connections. respond - send files.
persist state...

again this could all be done with ... well
the same notion as before. as all the auto
stuff. everything is just a variable.
you ... you have a variable called 'connection'
and then you have code that can respond to
it. so let's write the server using the same
approach and see what we need to make that
elegant.

connect. persist. channels. async. a connection
comes in and something picks it up and we respond ...
what if the responce takes too long? is the response
async? can we have generic timeouts on responses?

```js
export default {
    name: 'connection accepter',
    name_description: 'accepts tcp connections',
    iteration: '12a.1',
    iteration_description: 'trying to fix bug in timing',
    //....
}
```

some piece or part or component just feeds connections
into the global namespace somehow ... (still not sure
how to ... have a stack ... a single variable is fine
but a stack? an array?)

then other parts can pick it up.

but we want to have timeouts - if something takes too
long we have to either 1. respond with an error or
something (send an error back), 2. try another
component that can do the same thing. and also
perhaps record somewhere that this is happening ...
and time each component - maybe one component
consistently responds slowly.

that's the thing about asyncronicity - we need to
assume it could take 'too long'.

but we also need to have different components that
can do the same job - different attempts at solving
the same problem. but what if they produce different
results? do we keep running the same result for
each and compare and report any differences?

the idea is that we don't just have one piece of
code for each task. you can have several, each a
different attempt at doing the same thing.

and then also each attempt can have different versions - 
basically a series of bug fixes for each one ...

so an 'attempt' is really an approach. perhaps one
approach is ... to contact a server somewhere and
download the answer, where as another is to calculate
it. who knows which is better in which context.
and the software should figure out on it's own
which is best as it's running.

and if something breaks, an approach throws an error,
then we can roll back to a previous version ...

and of course all of these are under the rubrick
of the inputs / outputs etc. perhaps also the
timing restrictions. a policy document. you can
update the policy, say increase the timeout for
error state, but then you change the policy
directly and each implementation refers to this
policy.

it may sound like overkill to have all of this
for every single small part of your code but
all we're are doing is defining a general
interface, a generic way to tie any software
together, then defining all the occurances
we could have (which really is just 'an error
occurred' and 'took too long' and 'returned
a value'). and every piece of code could change.
and (this is not something i've ever seen
discussed) you could have various ... ways
of doing the same thing and you don't know
which is best and you want to put several
out into the wild and get feedback.

that's what i want, to be able to break
things down into the smallest part, and
to work with that part in complete isolation,
without any consideration of what it will
connect to, to describe precisely what it
is and how things could go wrong, to write
various versions, specify tests, specify
checks.

and then i want to take those smallest
parts and build up other parts with them
and do the exact same thing on that
greater part - specify everything around
it, it's entire border. in fact ... in
fact, i don't even know if i want to
have the smaller parts in it. really it's
just a bunch of borders ... and then
a verion could be a set of parts i pull
in ...

## insertion

```html
<div>
    <ComponentOne />
    <ComponentTwo />
</div>
```

instead of writing things like this,
explicitly inserting things in a
particular order, we could do it
like so:

```html
<div>
    {'ComponentOne'}
    {'ComponentTwo'}
</div>
```

the difference being that here
`ComponentOne` is not actually
that particular component but
rather a declaration that 'anything
that satisfies these conditions
can be inserted here'.

then we can easily have the ui
error case - if `ComponentOne`
fails we can instead insert
an error message, or maybe
toggle to a previous version
or some other component that
satisfies the conditions.

### multiple ui parts

this means ... we have to split
the ui into ... at least two
parts - one that says what goes
where, and another that ...
well it pulls in the respective
components ...

### explicit injection or discovery

which brings up a particular issue - 
should we have each piece explicitly
inserted - so we say 'in this ui
component we want _this_ particular
component inserted' - or do we instead
let the ui wire itself up: so the ui
component just says 'i need something
like this and i need something like
this' and then we just have this big
pool of components and we run through
and see what fits ...

i really, really like the latter. so
we don't have to say what goes where.
so we can just ... i have always wanted
a kind of auto-ui - a user interface
that builds itself. you just give it
data and it works.

so you just specify things like 'for
this data type show this' e.g.
'this is a string - show a text box'
or 'this is an editable toggle - 
show this toggle box'.

again - why not? auto layout, auto
everything.

### specify ui

i have a great idea - we have this
separate ui thing, perhaps called
autodom, and we just point it to
a set of auto objects and say
'this component is a ui element'
in which case ... well in which
case ... other elements need to
refer to it somehow, other ui
elements. and then there needs
to be ... i suppose we could
just have this global policy
of how to draw things ... could
we really draw a set of auto
objects automatically?

### snap-on code

perhaps ... perhaps we could
use the same approach for our
error reporting - some kind of
technique of attaching to
a set of auto objects and ...
with some kind of policy document
we say 'catch all errors for these
objects and then send them through
to here' ... so it's all just
a set of ... plugins? not sure i
like that word ...