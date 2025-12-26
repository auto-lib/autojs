# another rant

i'm busy going through some of the docs here,
my rants, trying to look at this library,
trying to understand what it is, why i wrote
it, what the issues are, why i keep running
into the issues i've been having ...

and the question i keep coming up with it -
why? what is the core thing, the core idea,
that explains it, the purpose of it, the
features i keep needing to add ...

and something just occurred to me - it's a
graph. it's static. it's not updating
anything. the whole purpose of the library
is to display something, some existing data.
that's it. it's data transformation. it doesn't
update the database. it doesn't, for the most
part, even call out to services - it's a static
tree. and there are controls, and those controls
change the flow of the tree. but the whole
reason i wrote auto is because i didn't want
to have to manage the flow of things, that
when you clicked "change currency to USD"
i didn't have to write a function that said "ok,
now we need to pull the data again, convert it,
make sure we convert the frequency as well" ...

that's what i haven't understood this whole
time. all this time, and all these rants, i
never saw what it was i was building. and
the _primary_ issue of all of this - all the
testing i'm doing, all the problems i'm having,
is when the tree is _wrong_! when it has the
wrong shape, the shape changes because i changed
the code somehow. and now the shape is different.
it's one shape! and it's not that complicated,
it's just that it's generic across the data.
but it's static - the whole program is static!
i'm not sure what to call this ...