
function make_extern(channel)
{
    return new Proxy({},{
        get(t,name) { return channel.imm('get',name); },
        set(t,name,value) { channel.msg('set check',{name, value}); }
    })
}

module.exports = make_extern;