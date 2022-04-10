
function check_test(library, name, test)
{
    console.log(name);
    console.log(' - obj',test.obj);
    let _ = library(test.obj);
    console.log(' - state',{
        cache: _.cache.state(),
        pubsub: _.pubsub.state()
    });
}

module.exports = { check_test };