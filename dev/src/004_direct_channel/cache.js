
function make_cache(channel)
{
    let cache = {};

    channel.sub('set check', msg => {

        let { name, value } = msg;

        cache[name] = value;

        channel.msg('set ok', {
            name, value,
            source: 'channel'
        });
    })

    channel.sub('get', name => {

        if (!(name in cache)) console.log('err:',name,'not in cache');
        return cache[name];
    })

    channel.sub('init', msg => {

        let { name, value } = msg;

        if (name in cache) console.log('cache name clash for',name);
        if (typeof(val) == 'function') cache[name] = null;
        else cache[name] = value;
    })
}

module.exports = make_cache;