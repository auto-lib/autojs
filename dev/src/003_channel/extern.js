
function make_extern(channel)
{
    return new Proxy({},{
        get(t,n) { return channel.imm('get '+n); },
        set(t,n,v) { channel.imm('set '+n, v); }
    })
}

module.exports = make_extern;