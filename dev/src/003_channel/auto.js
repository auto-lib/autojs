
let make_channel = require('./channel');
let make_cache = require('./cache');
let make_exec = require('./exec');
let make_extern = require('./extern');

function auto(opt,obj)
{
    let ch = make_channel();

    let cache = make_cache(ch);
    let exec = make_exec(ch);

    Object.keys(obj).forEach(name => {

        let val = obj[name];

        cache.add(name,val);
        exec.add(name,val);
    })

    return make_extern(ch);
}

module.exports = auto;