
let { compare } = require('./compare');

function check_test(library, name, test)
{
    let _ = library(test.obj);
    
    let a = {
        cache: _['#'].cache.state(),
        pubsub: _['#'].pubsub.state()
    }

    let b = {
        cache: test.cache,
        pubsub: test.pubsub
    }

    let same = compare(a,b);

    if (!same)
    {
        console.log(name,'fail');
        console.log(' - obj',test.obj);
        console.log(' - state auto',a);
        console.log(' - state test',b);
    }
    else
    {
        console.log(name,'ok');
        console.log(' - obj',test.obj);
        console.log(' - state auto',a);
        console.log(' - state test',b);
    }

    return same;
}

module.exports = { check_test };