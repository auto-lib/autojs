
function get_channel(opt) {

    if (!opt) console.log('FATAL no object specified');
    else if (!isObject(opt)) console.log('FATAL param not object',opt);
    else
    {
        ({ type, err } = opt);

        let e = err ? err : e => console.log('ERROR',e);

        if (!type) e('type not specified');

    }
}

get_channel({
    type: 'sub',

})

/*
    - we open a channel for setting the x value
    - we don't need a return value when this is fired
    - we expect only one received to respond (?)
    - we expect the respondents to run immediately
*/

put_channel({
    name: 'set x',
    return: false,
    receivers: 1,
    immediate: true 
})

/*
    - in reality several things could respond to the set x message
    - what else could we specify?
    - this is a way to generically write all the software i need
    - everything is just a communication channel
    - with only push and pull (put and pull?)
    - and without the sender or receiver knowing anything
    - about one another
    - why? right now it's just an experiment,
    - an attempt to write clean code
*/