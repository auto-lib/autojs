function convert_old(test)
{
    return {
        obj: test.obj,
        fn: test.fn,
        cache: test._.value,
        pubsub: test._.deps,
        fatal: test._.fatal,
        global: test.global
    }
}

module.exports = { convert_old };