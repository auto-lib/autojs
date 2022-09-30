
# direct channel

there are two ways we could use a publish
subscribe mechanism to connect together
each auto component (cache, executor, external) - 
generic names or specific ones (to subscribe to).

for example, we could have the cache subscribe
to `set` or we could have it subscribe to `set x`
and `set y`.

so this is about naming - how do we name events.

the code will be cleaner if we just use generic
names so this is just a rewrite of `003_channel`
but using that style, so i can see what it looks
like.