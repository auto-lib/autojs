
let fs = require('fs');

function fail(msg) {
    console.log('ERROR '+msg);
    process.exit(1);
}

function get_library()
{
    console.log('getting latest library from dev/src');

    if (!fs.existsSync('../dev/src')) fail('../dev/src does not exist');
   
    let files = fs.readdirSync('../dev/src');

    if (files.length==0) fail('no files in ../dev/src');
    
    let latest = files.slice(-1)[0];
    if (latest.slice(-3) != '.js') fail('last file '+latest+' is not javascript');

    let lib;
    let path = '../dev/src/' + latest;
    try {
        lib = require(path);
    }
    catch (e) {
        fail('could not import '+path+': '+e);
    }

    if (!('auto' in lib)) fail(path+' does not export auto');

    return lib.auto;
}

function get_tests()
{
    let tests = [];
    fs.readdirSync("./src").forEach(name => {
        tests.push(name.replace('.js', ''));
    })
    return tests;
}

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

module.exports = {
    get_library, get_tests, check_test
}