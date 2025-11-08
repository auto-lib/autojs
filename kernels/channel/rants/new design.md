i propose a new kind of software.

it starts with a list of functions:

```js
let make_x = () => {};
let make_y = () => {};
let make_z = () => {};
```

each function returns a _box_.

```js

let x_0 = make_x();
let x_1 = make_x();
let y = make_y();
let z = make_z();

```

and they can take one another in
as parameters on creation:

```js
let x = make_x();
let y = make_y({x});
let z = make_z({y});
```

even now we need:

- a mechanism for reacting to bad
  creation, e.g. what if `x` is
  not correct for `y`?
- a way to view the structure we
  have made e.g. return json of
  tree

i suppose we could call this
_Layer 0_.

## Layer 1

so _Layer 1_ is built on top
of _Layer 0_ and it specifies
what methods a box is, namely
it is an object with two
values: `sync` and `async`,
both of which are functions.

> we should put in a standard
> way of checking this, i.e.
> a standard `make` function
> that you can derive from ...

```js
let x = make_x();

x.async( 'one', {} )
x.sync( 'two', {} )
```

here we a _sending_ a message
to `x`, one for which we expect
an answer right away and another
for which we expect a response
at some other time.

now in order to specify what
messages can be accepted
we look at what is returned
by `make_x`:

```js
let make_x = () => box({
    async: {
        'one': (m,b,s) => {},
        'two': (m,b,s) => {}
    },
    sync: {},
    state: {},
    opts: {}
})
```

so this is saying `make_x` accepts
two message types: one called _one_
and the other called _two_.

we define how each behaves by a function
which takes in `m` which is a list
of messages

> we save the message list as it
> passes from one process to another

`b` is a list of boxes we are connected
to, and `s` lets us access the internal
state of the current box.

so here is what each signal handler can
do:

1. get the list of messages that led to
   our current point, including the latest
   one
2. list, interrogate, and send messages
   to connected boxes
3. get and set state local to the box
   (using functions, so we can audit
    changes and be immutable, etc)

> perhaps also we make `b[0]`, the first box,
be ourselves so we can add messages to the
queue / connect to other local handlers

---

maybe what we need
is a packet
that says (could say) various things

- what kind of handler it is looking for
- the id of the router it wants (optional)

so you could send a message saying "i'm looking
for anyone who can handle the message 'init'"

or it could even say "i want _everyone_ who can
handle the message 'init'".

...

so what we have is

- everything is broken down into 'routers'
- every router has a unique id (how?)
- every message is sent to a router
- routers can be connected to one another
- routers have a set of handlers
- each message specifies what it wants,
  like the handler, who the router is,
  perhaps what to do in various conditions,
  etc etc.

the message is starting to sound really
complex - essentially it's an instruction
booklet for how to behave.

also, each message when passed on should
have the router's id tagged onto it.

also, we want messages to be able to
produce more messages, and each of those
... well each of those is ... each of
those is a router ?

---

really what we're talking about,
what i'm talking about,
is something akin to the internet protocol - 
a way of sending messages through an
undetermined set of links.

the difference here is that,
well firstly this is both inside a computer,
inside a piece of computer _software_, it
is _how_ software is built!

but also different in that
each message can itself produce more messages ...

right so think of it like a brain - a signal
comes in, and it spawns a bunch of other signals,
and eventually one of them comes back ...

so routers on the net (as much as i understand)
get a message "please send this to this machine"
and it sends it to someone who seems close
and then they get a message back saying "remember
when you want to send this to this machine?
well they got it and this is the reply"

> is that how it works?

---

ok i know this sounds nuts - 
how long will these chains get?

but just imagine everything was written this
way - how easy it would be to understand
what was going on.

you could have a piece of software,
like a web app, where you click on a button,
and a message is sent to a local component,
which forwards it to another, and that spawns
three more, and one of those then leaves the browser
and goes to a server, which takes the message,
produces several more, and then more, etc etc,
and those eventually leave the server,
back to the browser (presumably using websockets...)
eventually back to, i dunno, the colour of the
background ...

ok. now you can go to any piece of state,
like the background colour of your component,
and say "where did this come from?" and it
shows you a trace going all the way back
to the server, the database query, the different
logic components ...

it does sound nuts, why would you want so much
information in every message, how heavy would
that be?

perhaps we could have each router implement
a 'trace' function (handler) where you give it
a message id and it says "yes i did receive
this message, here is when, this is what
messages i produced from it"

again, i'm proposing that using this ... micro-router
strategy? everything-is-a-router strategy, including
every logic component of your apps ... then
you would have one architectural thingy (piece?)
that everything is built with. a kind of super-brick.
just a thing that sends messages.

what should the messages look like?
how much should we design up front in the protocol,
or can we design it in a way that is protocol-free ...

what is the simplest protocol we could build
that could allow for other protocols to be
built into it?

you could say to a router "do you forward messages
on?". or you could say "do you accept the message
'get_hostname' ?"

it's kind of fascinating - just by thinking about
it i can design this ... way of connecting things
that allows one to build something of seeming
unbound complexity ...

perhaps it would be worth detailing all the
different possible architectures for a network,
for a bunch of pieces ...

the simplest thing - `send`. at some point you
have to actually run a function, which has to
say what you are sending. perhaps it also specifies
who you are sending it too...

```js
send('one',{}); // send empty object to router named 'one'
send({}); // send empty object (presumably to a particular router)
// what about sending ... to multiple routers? broadcast?
```

here are the ways of doing this i can see:

1. you have some function (`send`) which takes in an _id_
   and a _payload_. it must then have access to a list
   of potential _targets_

```js
let send = container.send;
send('one',{});
```

presumably the container is created at some point
and a bunch of targets are added to it somehow...

```js
let container = make_container();
container.add('one',make_box());
container.add('two',make_box());
```

2. you have a list of targets (or boxes) each of
   which has a send method.

```js
let one = make_box();
let two = make_box();

one.send({});
two.send({});
```

with the first option we can broadcast

```js
container.broadcast({});
```

also, we could say the payload must come
with a string that specifies ... the message
type?

```js
one.send('init',{});
```

another way we could do all of this
is to have some way of creating a
channel between two boxes - sort of like
a handshake where we decide what protocol
we are using, what the terms of connection
are, and then _that_ gives us a send function

```js
let send = one.connect({protocol: '12.x'});

send({})
```

---

should connections each have rates of firing,
like in the brain? perhaps every message that
comes in is giving a cooling off period before
we respond to it ...

again, we're developing some kind of generic
box that once designed can be used to build
out the entire ecosystem of a software system,
from interacting local components, to the
outside servers bringing in data.

perhaps the initial connection is heavy but
as signals keep coming in (messages) we
keep relaxing the handshaking and checks -
so the higher the frequency of messages
the less data we store in the message (for
checks, tracing, etc) and the less data
we store in logs, etc ...

https://www.youtube.com/watch?v=erVacDY441U

we should have a log-normal distribution
of frequencies of router sends (messages?)

how would we interrogate the network
in order to know how often a particular
message is being created?

how simple can we make things?
we could have every message
simply come in and change state - so
no protocol whatsoever ...
how would we implement security?

could we have a message type which says
"i am looking for _anyone_ who can deal
with this kind of message" and then
we come back with "this person can deal
with that message" and then we start
interacting with them, trying to determine
whether they are the one we want to deal
with ... and as time goes on we get more
and more confident with them, but at
any stage we can be like "nope - terminate"
or "ok i'm starting to loose faith, i need
more checks now".

and when you do terminate you can say "give
me anyone who can deal with this message
_except_ for this actor" ...

how do we account for bad actors? surely
someone could say "give me all the messages
for all the people" ... ???

> i suppose that could account for
> ... being bad, in a sense - even requests
> are treated in a way that ... every message
> is evaluated ... every connection is.

---

with the internet protocol you specify a source
and destination.

with this new design we have a source
but we do not have to specify a destination - 
instead we can just give a class, so we can
say "we want this handled by anyone with this
particular skill-set".

of course during a reply, once a machine / device
has picked up a particular message, well first
what happens is the message goes back saying
"we found someone who will handle this request
and they are busy handling it", perhaps with an
estimate for how long it will take.

> remember this is not just about sending data
> back and forth, it's about processes too now.
> hence the need for a time estimate ...

so again - instead of just a destination address
we can have a class specifier.

> it might be worth having mechanisms in place
> for ... ensuring the authenticity of ... the
> device? i dunno, i guess all the devices on
> your network can be signed somehow? tls?

ok - and so there are two ways a message is
picked up. either the message itself is a kind
of broadcast for a particular use case "i need
someone who can calculate the nth prime for me
please", or it's the other way around: someone
can say "i want to be sent any messages of
people asking for prime numbers" ...

> i suppose the second case is always one way?
> what is the purpose of it, logging? ...

> i guess it's a bit ... crazy to ... i dunno,
> it should just be the first case, just have
> any message be dealt with by anyone ...

of course you can specify the machine ...

ok, but when we say 'class' what we're really
saying is it's some function somewhere, in a
software component on some machine ... so how
do we specify the class? it must be some kind
of id ... surely not just an alphanumeric
string ... i suppose it very well could be.
and it would have to be versioned, i guess?
using semantic versioning?

this all seems kind of nuts - where is this
all going? how did i get here?

---

should totally have a time to live counter - 
we specify how many hops until it dies ...

---

maybe a box ... should have a list of boxes,
and the only way to ... send data, send
anything, is to ... is for a box to send to
one of it's boxes ...

```js
let a = box('a');
let b = box('b');

b.on('ping', src => {
   console.log(`ping on b from ${src.id}`);
   src.send({message: 'pong'});
});

a.on('pong', src => {
   console.log(`pong on a from ${src.id}`);
});

connect(a,b);

a.send(b.id, {message: 'ping'});
```