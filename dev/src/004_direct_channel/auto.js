
/*
    what does exec do?
    - it responds to variable changes
    - it publishes variable changes
    - it generates errors
    - it reads from the cache? (perhaps the cache is built in)

    we could have one exec per function.
    then we attach the same cache to each.
    and then extern just accesses said cache.

    (how do we see internal variables like dependencies?)
*/

let channel = require('./channel');
let cache = require('./cache');
let exec = require('./exec');
let extern = require('./extern');

function auto(opt,obj)
{
    let ch = channel();
    let ca = cache(ch);
    let ex = extern(ch, ca);

    Object.keys(obj).forEach(name => 
    {
        let value = obj[name];

        exec(ch, ca, name, value);
    })

    return extern;
}

module.exports = auto;