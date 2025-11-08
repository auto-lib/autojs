
let trace = false;
let warn = true;

let boxes = {
    'a': {
        'packets': [],
        'handlers':[
            {
                source: 'a',
                fn: (source, message, id) => console.log(`[a] got message '${message}' with id ${id} from self`)
            }
        ]
    },
    'b': {
        'packets': [],
        'handlers':[
        {
            source: null, // any source
            message: 'ping',
            fn: (source,message,id) => {
                console.log(`[b] got message '${message}' with id ${id} from [${source}]`);
                send('b',source,{ message: 'pong', id });
                // send('b',source,{ message: 'peng', id });
            }
        },
        {
            source: null,
            message: 'long_process_start',
            fn: (source,message,id) => {
                console.log(`[b] got message '${message}' with id ${id} from [${source}]`);
                setTimeout(() => {
                    send('b',source,{ message: 'long_process_done', id });
                }, 1000);
            }
        }]
    }
};

// https://medium.com/@weberzt/how-to-create-a-random-id-in-javascript-e92b39fedaef
makeId = () => {
    let ID = "";
    let characters = "ABCDEFZ0123456789";
    for ( var i = 0; i < 6; i++ ) {
      ID += characters.charAt(Math.floor(Math.random() * 16));
    }
    return ID;
  }

let send = function(from,to,packet,handlers)
{
    if (!from) { console.log(`error: no from in send`); return; }
    if (!to) to = from;
    if (!packet) { console.log(`error: no packet in send`); return; }

    let to_box = boxes[to];
    let from_box = boxes[from];

    if (!to_box) { console.log(`no box named ${to}`); return; }
    if (!from_box) { console.log(`no box named ${from}`); return; }

    packet.source = from;
    if (!packet.id) packet.id = makeId();
    to_box.packets.push(packet);

    // handlers are added to the from box
    // with the source and id added
    // so you can catch anything that comes back
    if (handlers)
    {
        handlers.forEach(handler => {
            handler.source = to;
            handler.id = packet.id
            handler.start = performance.now();
            from_box.handlers.push(handler);
        })
    }
}

send('a', 'b', {message:'ping'}, [
    {
        // watch for message 'pong' in reply (i.e. with same id)
        message: 'pong',
        fn: (source,message,id) => console.log(`[a] got message '${message}' with id ${id} from [${source}]`),
        timeout: {
            ms: 500,
            fn: (source,message,id) => console.log(`[a] timeout waiting for message '${message}' with id ${id} from [${source}]`)
        }
    }
]);

send('a',null,{message:'blerg'});

send('a','b', {message:'long_process_start'}, [
    {
        message: 'long_process_end',
        fn: (source,message,id) => console.log(`[a] got message '${message}' with id ${id} from [${source}]`),
        timeout: {
            ms: 500,
            fn: (source,message,id) => console.log(`[a] timeout waiting for message '${message}' with id ${id} from [${source}]`)
        }
    }
]);

function process(name,box)
{
    if (trace) console.log(`processing box ${name}`);

    let { packets, handlers } = box;

    while (packets.length>0)
    {
        let packet = packets.pop();
        let { source, message, id } = packet;
        if (trace) console.log(` source: ${source}, message: ${message}, id: ${id}`);

        if (handlers.length==0) console.log(` warning: no handlers in ${name}`);

        let count = 0;
        let toDelete = [];
        for (let i=0; i<handlers.length; i++)
        {
            let handler = handlers[i];
            
            if (trace) console.log('  handler',handler);

            if (handler.id && handler.id !== id) { if (trace) console.log('  skipping because id not same'); continue; }
            if (handler.source && handler.source !== source) { if (trace) console.log(`  skipping because source not sameno source`); continue; }
            if (handler.message && handler.message !== message) continue;
            
            handler.fn(source, message, id);
            count++;
            if (handler.id) toDelete.push(i);
        }
        
        // remove handlers for packets which specify the id
        for (let i=toDelete.length-1; i>=0; i--) handlers.splice(toDelete[i],1);

        if (warn && count==0) console.log(`warning: no handler in ${name} for message '${message}' id ${id} from ${source}`);
    }

    let toDelete = [];
    let now = performance.now();
    for (let i=0; i<handlers.length; i++)
    {
        let handler = handlers[i];
        if (!handler.timeout) continue;
        if (now - handler.start > handler.timeout.ms)
        {
            handler.timeout.fn(handler.source, handler.message, handler.id);
            toDelete.push(i);
        }
    }
    for (let i=toDelete.length-1; i>=0; i--) handlers.splice(toDelete[i],1);

    if (trace) console.log(`done processing box ${name}`);
}

let packet_count = () => Object.keys(boxes).reduce( (acc,key) => acc + boxes[key].packets.length, 0 );
let handler_wait_count = () => Object.keys(boxes).reduce( (acc,key) => acc + boxes[key].handlers.filter(h => h.id).length, 0 );

while (packet_count()>0 || handler_wait_count()>0) Object.keys(boxes).forEach(key => process(key,boxes[key]));

// function box(obj)
// {
//     let { async, sync, state, opts } = obj;

//     return {
//         async: function (obj) {
//             let { name, data } = obj;

//             return {
//                 expect: function (name, opts) {
//                     let { timeout, after } = opts;

//                     let tf;
//                     if (timeout)
//                     {
//                         let { ms, fn } = timeout;
//                         tf = setTimeout( () => {

//                         }, ms);
//                     }
//                 }
//             }
//         }
//     }
// }

// let obj = box({
//     async: {
//         init: (m,b,s) => {

//             let { name, data } = m[0];

//         }
//     }
// });

// send an init message to object.
// if we do not get a 'complete'
// response within 1000ms, show
// an error. otherwise print how
// long it took.

// obj.async({
//     name: "init", 
//     data: {
//         target: document.getElementById('root')
//     }
// })
// .expect('complete', {
//     timeout: {
//         ms: 1000,
//         fn: () => console.log('timeout after 1000ms')
//     },
//     after: ms => console.log(`completed in ${ms}`)
// })
