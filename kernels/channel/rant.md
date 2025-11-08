
there is a ton of great code in here
but i've been developing this really
big new idea and not sure where to
talk about it and this seems the best
place, not sure what to call it.
eventually it will replace this code.
really it's based on this repo, an
evolution of the idea of a signal - 
really it's about a signal that can
travel anywhere.

really what i want is something bigger - 
so we have this core library, signal.
then auto is build on that. then
run is an example of it. then test
runs on the tests dir. but this is
all within an execution context - it's
within this laptop, this one run of
node. but i am managing all these
different processes - scripts running
on various servers, various apps
running on websites. how do i monitor
them all? how do i ensure they are
all working properly? how can i get
visibility on how they are working,
how can i easily diagnose any problems
and easily develop and test and deploy
new features?

i'm not sure how to solidify this but
it seems (or feels) true to me that
the only solution to this is to
build everything (and i mean _everything_)
using a unified messaging system. that's
the big idea. so in this repo i have a
... reactive code framework built up
using the idea of signals, which i guess
is a kind of message. the difference is
transport - the signal cannot travel out
of this program and into another.

i'm trying to figure out the simplest way
to do this. and what i'm trying to do is -
have a global / universal messaging system.

that ... is of course a problem that has
many ... libraries. but i want to build
this one up because ... the idea here
is not just a messaging system for servers
and applications but ... the messages
also are the application logic - the auto
idea of having each piece of state be
updateable only through one function.
it sounds nuts but you'll be able to
trace literally any effect through your
entire system.

> not sure what to call it - _system_ ?
> it's the servers, the web apps.
> the cron utilities. the python scripts.
> the javascript bundle that gets deployed
> to the website. the instance of these
> apps on each browser for every visitor
> to the site. what ... is this whole
> thing all together called? the ...
> universe? the 'complete system'? strange
> there is no word that comes to mind...

one messaging system. so everything is run
through this one system, that's the idea.
and we can tell everything that is happening
through it. everything is orchestrated
with it, everything is built with it. we're
saying "we are going to build the entirety
of our computing systems around one
inter-protocol network, something that
straddles http, inter-process, intra-process,
everything - one network through which all
the components of our (god what is that
word? universe? landscape? setup? ooo complex).

ok i'm going to use _complex_ to describe
the whole shebang - your entire system.
all the stuff. everything. because this is
the idea - have all the stuff, everything,
be managed all together, using one thing - 
a messaging ... platform? ugh. ooo service...
(i'm using chatgpt to get new words - 'what
word is like platform for a messaging
system').

so we use a messaging _service_ to ... ugh
i dunno, service? maybe we just say ...
well the messages include all these different
bits and pieces to enable it. you need
clients, exchanges. different ones for each
platform, like one for javascript, another
for python ... one that interlinks with
websockets. one for nsq.

'we use a messages to build our platform'.
that's better. hmmm. 'we build our platform
on top of a messaging layer.'

the idea is that you can ... it's agnostic.
you can write a script in python that connects
to an exchange and puts a message onto the
platform. or asks for messages on the platform.

really that's the long and the short of it
, well not really, we still need to talk implementation,
but from a use point of view that's it - you
write some code in your language of choice,
you import a library called `channel` or whatever,
you setup or create a new object that can connect
to an _exchange_, giving it some connection details
(perhaps an ip address, maybe no need since it's
like a global state object?), click connect,
pass in some function to run if the connection
is successful (and what to do if not...),
and now you ... can interogate it, ask it
what messages there are, what channels,
put messages on the stack ... you talk to the
exchange. it could say 'you cannot put a message
on that channel' or 'no such channel' or 'you
do not have access' or 'you have exceeded
you message quota' ...

and using this one thing, just an exchange,
you build up everything. everything is built
like that. you send messages, you receive messages.

in fact, we could simplify it - you send a message
out, back comes something and it has to be from
something on the network. (so we don't build caching
and whatnot into the network, that's just another
device on the network! that you can query...).

everything, everything is just something connecting
to an exchange. one thing you can do is say 'i will
accept messages that look like this'.

so it's just this open, free-for-all thing... how do
we manage it? bad actors? access rights? we want to
ensure messages don't go to the wrong place.

i like the idea of calling this `exchange`.

of course you need to setup the exchanges ...
what does that look like? how do we separate ...
the messages in the exchange with ... what is the
job of the exchange? just to send messages on?
what channels will there be? how do we conect
between channels? how do we ensure things don't
get congested? perhaps the exchanges can produce
and consume messages too, so they could for example
produce messages that say 'hey i'm congested'
or 'there are a lot of dropped messages here'...
and of course we would have to have a consumer
pick those up for us to know about it, but they
will be there...

really what you want is ... like a message
buffer or stack or queue - a bag of messages,
and for each one you need to decide what to
do with it. and the exchange can put another
message onto the stack, but it can also ...
well it can also modify the message (perhaps
it always does, puts it's mark onto it...)
and then it can connect to another exchange
and put it's message onto that exchange's
stack ...

which again, suggests that ... everything
is an exchange. including consumers / producers.
maybe the only difference is that an _exchange_
has more than one peer - where-as a consumer/producer
just has one.

but it's all just ... like the signal library
in this repo, you have a thing that can handle
certain messages ... and it produces certain
messages ...

so maybe everything is an exchange. you write
your code as 'ok i'm an exchange' and then
you just 'add a peer' i.e. connect. and when
you connect to the peer you tell it 'i am
happy to handle these messages'. and then you
send it a message like 'what are all the
failure messages that have happened?' and
you send it to your peer and it says 'i can't
handle this, but i have a peer who can'
and then it sends it to the peer who says
"actually i can't handle this either but
this peer said he could" ...

so what happens is when you connect and tell
your peers what you can handle it spreads
through the network (hmmm...)...

is that it? if so it's beautifully simple.
i hope that's it.

so everything is an exchange. to join the
network you become an exchange, then connect
to a peer (multiple peers?). then you can,
if you want, tell the peer what messages
you are open to handling. (perhaps later
you can say 'i am no longer open to these
messages'). and then you can send messages
to the peer too...

that ... does sound solid. lots of details
to work out. lots of other issues as well,
like how do you communicate your expectations
for a message, i.e. 'i expect a response' ?
(maybe you don't ...).

also, of course some exchanges will accept
peer connection requests. i guess that is
moot - there can be many types of exchange
peer requests, with authentication ,etc etc,
but it doesn't effect the core mechanisms
i layed out above.

ok. this is good. `exchange`... ? oo `phora`...

'exchange is a platform-agnostic messaging
system'. nice. '... design to ... (???)'

- '... work within a program and between programs'
- '... work on small time scales and large'
- '... build applications and connect them'
- '... encapsulate both the inside of software systems
  '    and the connecting fibre between them'

> last one sounds a bit pretentious

'exchange is a platform-agnostic messaging
system. it was build to fascilitate knowing
what is happening both inside of your running
software and what's happening around it.
in a word, everything is meant to be build
on top of it - from the state in your javascript
program updating reactively (by notifying 
pieces of code to update other state) to your
server writing to the logs'

'exchange is an experiment in software
architecture - what if everything was built
using messages?'

'exchange is a radical experiment in both
building software and connecting cross-platform
components using the same, custom network.'