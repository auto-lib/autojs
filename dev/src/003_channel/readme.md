# channel

i spent ten days on silent retreat thinking about how to
contruct the auto functionality in a way that allowed
separate units and came up with what i ended up calling
_channels_. i seem to have forgotten most of what i
had carefully planned out then but it kind of seems like
my idea really was just a publish subscribe model.

```js
import make_channel from '@autolib/channel';

let ch = make_channel();

ch.sub('set x', msg => console.log(msg));
ch.msg('set x', { value: 10 });
```

so every message has a label (here `set x`)
and you can subscribe to them using a function
and you can generate them.

my idea was that everything would be build around
this - the whole of auto would be centered around
a set of channels - everything would be split
up into _units_ each with one channel inside
(which connect the cache, the executor and the
external access object) and that units could
connect to other outside channels.

```js

let main = main_channel();

let numbers = auto(
    {
        channels: {
            channel: main,
            inputs: [],
            outputs: ['one','two','three']
        },
    },
    {
        one: 1,
        two: 2,
        three: 3
    }
)

let letters = auto(
    {
        channels: {
            channel: main,
            inputs: ['one','two','three'],
            outputs: ['a','b','c']
        },
    },
    {
        a: _ => _.one * _.two,
        b: _ => _.two * _.three,
        c: _ => _.three * _.one
    }
)
```