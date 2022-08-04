
function make_channel()
{
    let subs = {};

    return {
        sub: (name,fn) => {
            if (!(name in subs)) subs[name] = [];
            subs[name].push(fn);
        },
        msg: (name,body) => {
            if (!(name in subs)||subs[name].length==0) 
                console.log('warn:',name,'not found in subs');
            else subs[name].forEach(fn => fn(body));
        },
        imm: (name,body) => {
            if (!(name in subs)) console.log('err: no sub for',name);
            if (subs[name].length>1) console.log('err: too many subs for immediate (',name,')');
            return subs[name][0](body);
        },
        clear: name => delete(subs[name])
    }
}

module.exports = make_channel;
// export default make_channel;