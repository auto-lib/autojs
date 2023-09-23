## syntax

the totality of **auto**'s syntax is:

 - `auto` wraps a plain object
 - each object member pairs with either a value (e.g. `null`) or a function
 - each function takes in the wrapped object `$` as input, returns a value and can refer to any other members via the wrapped object

> actually i've left out _auto blocks_ and _subscribe_ which i will document soon