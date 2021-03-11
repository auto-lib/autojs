
## doclog

i have a log of my thoughts about the design of the library
but what i really need is a log of all my thoughts about
the documentation. because i don't want to put my ramblings
into it.

## what to cover

there's so much to cover, though what i really want is to
find the most important kernel and build everything out from
that instead of having a bunch of random thoughts that
don't give you solid, actionable understandings of what is
going on.

## structure

i might try doing things the same way as the source:
each idea i have has an associated source file e.g.
`012_its_all_about_side_effects.md` and the source
file itself is an exact layout and contents of
the documentation - the front-page and all subsequent
pages e.g.

```
# readme.md

// root readme contents in here

## docs/what-is-auto-really.md

// contents of, you guessed it, docs/what-is-auto-really.md

```

and then i'll have a script inside of `doclog` which splits
this out into the respective files the same way the script
in `devlog` does this with the auto lib.

it's a cute idea but seems perhaps too ambitious / untenable:
re-write the entire structure each time? manage each and
every doc? it's so much easier to just ramble... and code
is so much more terse. though maybe that really is the
right way to do things - to try make the documentation as
terse as possible.

let's give it a shot

## 000_first_try.md

so right now i have 9 documents:

 - `readme.md` - front page
 - `docs/explainability.md` - sort of a users manual...
 - `docs/html.md` - tutorial
 - `docs/internals.md` - a walkthrough of the code
 - `docs/npm-and-node.md` - a tutorial
 - `docs/ok-but-what-is-auto.md` - rambling
 - `docs/old-readme.md` - historical
 - `docs/syntax.md` - a manual
 - `docs/why-reactivity.md` - philosophy

ok this is useful...
right up i can see a few things:

 - i should group the `tutorials` together, possibly in their own folder
 - perhaps also have a `manual` folder for terse-as-possible technical explanations for users
 - perhaps a `philosophy` section to prosletise my pretentious views on what this all means... :|
 - and then... should i put `old-readme` into a `historical` folder?

should i put a doc map on the front page? or what about in `docs/`?
think it might be better on the front page.

ok that seems to cover it. but what is the front page for?
really it seems to be about selling the thing.
it's about trying to convince people to look into it.

i dunno, maybe `philosophy` is being a bit hard on myself.
i really think what i have to say about programming is right.
and it feeds into everything - why the library was made,
it's design, it's applicability...

but that really is separate from the `manual` which is just
"ok i get it i just want to use it now" stuff.

maybe instead of `philosophy` i should put it into a folder
called `why` ? though that seems a bit hokey.

- `readme.md`
- `docs/historical/old-readme.md`
- `docs/historical/story-time.md` (or any other ... just stories? of me and this stuff? for people who like stories?...
does that match with putting in the old readme?)
- `docs/manual/internals.md`
- `docs/manual/syntax.md`
- `docs/manual/explainability.md` hmmm though this is kind-of like a tutorial...
- `docs/tutorial/npm-and-node.md`
- `docs/tutorial/html.md`
- `docs/discussion/what-is-reactivity-good-for.md` - hmmm i think this title may be better than `why-reactivity`
- `docs/discussion/what-is-reactivity.md` - erm this needs to be discussed too... really it's "what do _i_ think is reactivity..."
- `docs/discussion/when-to-use-reactivity.md` which again is very important by kinda the same as why/what is it good for...
- `docs/discussion/bad-reactivity.md` which again, this is all really confusing / overlapping ...

glad i'm doing this, definitely a good idea.
`ok-but-what-is-auto.md` is really just a ramble but there is stuff in there
that would be useful if i can find a way to coax it. would be nice to have a
format for rambling, not sure this doc is the right way to do it... i dunno,
i don't want to complicate things too much, let's just stick with this format
i.e. just this one doc for rambling. but what is `ok-but-what-is-auto.md`
about? really it's an attempt to convince someone who doesn't buy it by
walking them through a project, really my project, the one that led me to
this, and saying "ok what would you do?" and show how the standard approach
does not work. it's not so much about "ok this is how you should see software"
which is what a lot of the `docs/discussion` is about, but really it's about
saying "let's sit down and chat".... :|

## asynchronous code

saw an article on hacker news where someone was complaining about how bad
asynchronous code is in rust ... and they referenced this apparently famous
diatribe about how broken asynchronous code is in javascript
https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/
and i feel like this whole reactivity without side effects thing fixes
that - in fact, and i admit this feel vague but, it seems as though this
might be a new thing altogether.

when i first came upon this idea really i thought - i could write software
this way (i actually have a blog where i ranted about this but really it
was just about emotions). that this really is different, it's like ...
i can't think of a good analogy. like flying as opposed to driving - not
the same thing at all. game changer. like a real one. a new way to write
software.

to be honest, i'm not sure about ordinary one-run software, like something
that just does some particular thing and then exits. i mean, who cares
about sequences then. i suppose it could help ... i need to flesh this out.
but one thing i feel a lot more sure of it interactive software - software
that must manage unknown events. software without a single flow. it's not
just one path, one run through. it's multi-variate paths that need to flow
around circumstance. in that case ... in that case defining state in terms
of functions ... if it really does do what i think it does, which is encode
logic without sequencing, if you really can replace existing software with
that paradyme - one object with all the logic ...

and it seems naturally to handle asynchronous stuff. it is asynchronous
but definition. having some event return some data at some unknown stage
in the future it what the architecture is based on. that is the architecture.

i just don't know how to flesh this out. firstly, just to convince people of
the idea that "we should be writing all code this way". i mean, even just to
say it ... and if it were true, why? well the reason is obvious - because
all this stuff you were managing before you don't have to manage anymore.
because it's better - _way_ better. because it makes complicated things
simple. this one idea.

and i think "reactivity without side effects" isn't strong enough if this
is really what i'm going to go for - declaring all code needs to be written
in a totally new way. i need a term, something that encapsulates that you
are no longer writing lists of instructions, each of which call other lists.
path-free programming? nice. a lot of people are going to say "this is just
declarative programming" which isn't completely incorrect, which will make
it that much more insidious. yes - you are declaring things. you declare
what things are. but you do so with normal functions, not with some clever
syntax. it's still normal programming - this isn't a new language or new
platform or mathematical thing. you can do this with any programming
system. it's just an approach - an approach that is (i think...) light
years away from what we do now. an approach where ... every piece of
business logic (i hate that term) is cellular. every idea, every thing
you wire together are values - important values. you decide on what the
important values are, and then you define their relationships. that's it.
you don't define a machine that does things. we no longer do that. we are
no longer in the business of building machines - we are instead talking to
a machine. don't tell the machine what to do....

again the whole declarative programming term comes in. these words, man they
can be so destructive when they are close enough to convince people to stop
listening.

## the pitch

there are a few directions I could take about **auto** when pitching it
on the front-page:

 - `reactivity without side effects`. i like this because it is relateable.
 it links with topics that people are discussing a lot right now, _reactivity_
 and _side effects_, and it's technical spot on: it is reactivity and side effects.
 - `automatic variables`. this i like too because it gives a fresh perspective.
 it's more towards saying "this is a new way of seeing things". i do think
 there is more to say than "reactivity could be done better". really what
 i'm saying is "this is a different paradyme" ... or ... i don't want to loose
 the strength of this as an approach. i feel as though an entire class of
 software problems need to use this technique, this thing of associating
 variables with functions.

 one recurring issue i'm having, though, is deciding on the scope of this
 'new paradyme' - is it just for events? there is clarity there somewhere...
 there is a core principal at play here which will make it clear where
 this is applicable. because part of me feels like "well if you can define
 variables as a particular process why wouldn't you just codefy it, and
 let the software keep it up to date" ... but does that apply to any
 software? there is something pernicious in particular about dealing with
 events ... like an interrupt - something that occurs right in the middle
 of your code. non-linear code ... or non-sequential code. hmmm i like
 that. new discussion: `non-sequential code`... because that really is
 a separate paradyme (ok - the word is spelt **paradigm**) - old software
 just ran once. it started at the beginning, went through a bunch of steps,
 and then exited. but if it keeps running ... then that means it's
 waiting for _something to happen_. and it's this that changes everything...
 because ... why? because of state?

 i need to separate the idea from the library. and so i need a term for
 the idea, or approach:

  - `single-variableness`
  - `connected quantities`
  - `declarative values`

again, i loathe to think how many people will say "this is just
declarative programming". i need to flesh out why this is not that...

# this is not declarative programming

> isn't it, though?

no, seriously - if it was then why am i jumping up and down about this
being a new and amazing thing?

ok, let's go to wikipedia:

> In computer science, declarative programming is a programming paradigm—a style of building the structure and elements of computer > programs—that expresses the logic of a computation without describing its control flow

yeah that's pretty much what i'm doing here... they even used the word
_paradigm_ ...

i mean, look - yes this falls into the category of declarative programming.
but imagine somebody said "hey check out this new thing called haskell"
and people said "that's just functional programming"... hmmm bad analogy.

let's take another crack - what am i doing:

> all global state is either a value, which can be set, or a function which
> uses the state

hmmm that's ok. i hate the word `state`. it's like a word that people say so
much that nobody stops and says "what does that mean, really?". you know,
because people would look at you incredulously like you just asked what is
the sky. i'd like to circumvent this by using another term...

a deeper way to think about "state" is that it ties your software together:
values (or variables) really are like nodules that hold nerves together
(synapses?). they are way points. they are cross-roads. (i'm loving these
analogies). it's where functions meet. ha! this is brilliant.

> variables are where functions meet

that's definitely a t-shirt.

and so, again, back to my big debate: is this just about programming for
events / non-sequential programming, or can this be seen as some deeper,
more powerful truth about what software is?

