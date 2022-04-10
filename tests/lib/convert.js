function convert_old(test)
{
    return {
        obj: test.obj,
        fn: test.fn,
        cache: test._.value,
        pubsub: test._.deps
    }
}

module.exports = { convert_old };