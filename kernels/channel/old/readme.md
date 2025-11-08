
# channel

i have this idea that everything i've done so far
can be written using a subscriber/publish
approach.

the initial purpose was to split auto objects
up into parts. so in `run.js` every auto object
not only connects values to functions (now inside
of `state`) but specifies what values it gets
from the outside and what values it publishes ...

so each auto object _subscribes_ and _publishes_
changes ...

then my idea was, ok, we need to have something to
add them all to - some kind of way of connecting
them, like a parent object. and then i thought -
well the parent object could just be another auto
object and it had imports and exports too ...
so you can create this cascade of objects, these
layers of onions, at each layer knowing exactly
what is going in and what is going out - each
layer is a black box you should be able to
reason about.

ok - an interesting idea and perhaps worth implementing
to see how it turns out, but how to implement it?
is there some kind of underlying pattern that would
allow this feature set done elegantly?

looking at `run.js`, what do we need?

- each object has children
- each child has imports and exports
- we need to let each child know if a sibling has exported
  a value it has imported
- we should also check up front whether the imports/exports
  between siblings line up i.e. one isn't importing a value
  that is not being exported from anywhere

perhaps we should ... let children see what the parent
is importing too? this is starting to remind me of
react, how you have to pass values down to children ...
what if you have a global object? with global state?
do we really have to import them all the way down?

it's also, since it's like react, starting to look like
a function - one function, with parameters, and functions
inside of it ...

which i suppose falls out of the parent / child relationship ...

one way to avoid this is to have the 'child' specify
_channels_ that it connects to - and this channel
can be any number of objects. everything is a sibling.
then in order to connect two auto objects together
you need a third object which imports values from the
one and exports to the other ...

> i like this better somehow

