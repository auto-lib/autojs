
function make_cache(channel)
{
    let cache = {};

    return {
        add: (name, val) => {

            if (name in cache) console.log('cache name clash for',name);
            if (typeof(val) == 'function') cache[name] = null;
            else cache[name] = val;
            channel.sub('set '+name, msg => {
                cache[name] = msg;
                channel.msg('set ok '+name);
            })
            channel.sub('get '+name, msg => cache[name]);
        }
    }
}

module.exports = make_cache;