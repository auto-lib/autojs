
## reactivity is a game changer

because of sequencing.

> another term used is _program flow_ or _flow logic_
> but i think that doesn't capture the fact that
> it is a _sequence_ of steps i.e. discrete, one
> after another. it's not water.

until now writing software has been about
chaining together statements using variables
as way points.

```js
let x = 10;
let y = x * 20;
let z = radius(x,y);
```

the reason it had to be this way is because
we were put in charge of variable content.
you're told that it _was_ programming - you
make an empty space called `int` or `String`
and you fill it in using operations and
functions.

> that's what the original design
> for a theoretical computer used - spaces
> to be filled in. i'm thinking of the ticker-tape.
> is that a good image?

what is there besides variables? well, after
variables were invented there came functions.

> what are functions? i don't know. let me think about it :|

reactivivity (i'm specifically not saying 'reactive programming'
because they term has been commandeered) instead puts
functions front-and-centre? functional programming ... hmmm...

the idea really is - no longer manage variables.
or: some things never change. sometimes you have a particular
thing that follows a particular process... (isn't that what
programming is?) ... and you want to just make sure it
keeps happening the exact same way every time any of the
parameters change ...

this is getting so confused. really what i want to say is
this: variables shouldn't be touched by humans. only functions.
really, that's it... take variables _away_ from programmers!
(that's a good tag line). we do not have the where-withall
to manage more than one level of indirection ... in fact,
who has time to manage just one! why are we doing it?
variables ... should be left to the machines (another great
tag line ... though maybe 'compiler' instead of 'machines'?
yuck). that would be a great article title, though - variables
shouldn't be left in the hands of programmers...

but really, it's more than that - _orchestration_ or another
term _sequencing_ shouldn't be left to the programmer ...
but perhaps for now we just start with variables ... 

ok the law of **auto** is this: each piece of global state
is either 1. just a plain value which you can change
how you please, or 2. a named function which cannot be
changed directly but which the function itself solely determines
the value of. doesn't sound so great when you lay it out
like that...

