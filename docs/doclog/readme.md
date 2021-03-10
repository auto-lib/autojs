
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