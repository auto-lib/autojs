
function make_exec(channel)
{
    let fn = {}, deps = {};

    let run = name => {

        let ctx = new Proxy({}, {
            get(t,n) { deps[name].push(n); return channel.imm('get '+n); },
            set(t,n,v) { console.log('err: cannot set',n); }
        })
        let v;
        deps[name] = [];
        try { v = fn[name](ctx); }
        catch { console.log('exception in',name); }
        channel.msg('set '+name, v);
    }

    return {
        add: (name, val) => {
            if (typeof(val) != 'function') return;
            if (name in fn) console.log('fn name clash for',name);
            fn[name] = val;
            run(name);
            if (deps[name].length==0) console.log('warn: no dependents for',name);
            deps[name].forEach(dep => {
                channel.clear('set ok '+dep);
                channel.sub('set ok '+dep, msg => run(name));
            })
        }
    }
}

module.exports = make_exec;