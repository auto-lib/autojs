
function make_exec(channel)
{
    let fn = {}, deps = {};

    let run = name => {

        if (!name) { console.log('no name in run'); return; }

        let ctx = new Proxy({}, {
            get(t,n) { deps[name].push(n); return channel.imm('get',n); },
            set(t,n,v) { console.log('err: cannot set',n); }
        })
        let value;
        deps[name] = [];
        try { v = fn[name](ctx); }
        catch { console.log('exception in',name); }
        channel.msg('set check',{ name, value });
        if (deps[name].length==0) console.log('warn: no dependents for',name);
        channel.clear('set ok');
        channel.sub('set ok', msg => {
            let { name } = msg;
            run(msg['name']));
    }

    channel.sub('init', msg => {

        let { name, value } = msg;
        
        if (typeof(value) != 'function') return;
        if (name in fn) console.log('fn name clash for',name);
        fn[name] = value;
        run(name);
    })
}

module.exports = make_exec;