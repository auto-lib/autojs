
## why reactivity is a game changer

because of sequencing. reactivity is [reactions to variable changes](docs/discussion/what-i-mean-by-reactivity).
instead of wiring together functions you wire together variables.
when you use functions to orchestrate your code the order in which
things are done become are your responsibility. with reactivity you can
(if you do it [correctly](docs/discussions/reactivity-without-side-effects.md))
write software without ever having to manage the sequencing of execution
again.

think about it this way: whenever something happens in your software,
like a user clicking a button or having received something from a server,
as a programmer you are now responsible for deciding "what should happen
next?". with reactivity you don't need to do this anymore - what should
happen has already been determined.

> though really i should just be
> talking about **auto** here since ordinary reactivity ... doesn't actually
> let you specify what should happen, just a bunch of things that overlap
> and can't be determined...