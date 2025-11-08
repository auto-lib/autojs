
/* it might be worth preserving the following
   as an example of two sets of code that do
   the right thing - which is easier to understand? */

   function _auto(obj)
   {
       // ------------
       // basic checks
       // ------------
   
       if (!obj) { console.trace('FATAL no object passed in'); return; }
       if (!isObject(obj)) { console.trace('FATAL non-object passed in:',obj); return };
   
       // --------------
       // error handling
       // --------------
   
       let name, onerror, onwarn;
   
       if (typeof obj.name !== 'undefined') name = obj.name;
   
       // default handler
       let err = msg => name ? console.log(`[${name}] ERROR`,msg) : console.log('ERROR',msg);
       let warn = msg => name ? console.log(`[${name}] WARNING`,msg) : console.log('WARNING',msg);
   
       if (typeof obj.onerror !== 'undefined') onerror = obj.onerror;
       if (typeof obj.onwarn !== 'undefined') onwarn = obj.onwarn;
   
       if (onerror)
       {
           if (typeof onerror !== 'function') err('error handler is not a function');
           else err = msg => onerror(`[${name}] ${msg}`);
       }
   
       if (onwarn)
       {
           if (typeof onwarn !== 'function') err('warning handler is not a function');
           else warn = msg => onwarn(`[${name}] ${msg}`);
       }
   
       // -------------------------
       // warn about unknown fields
       // -------------------------
   
       //let keys = ['name','state','imports','exports','actions','channels'];
       let keys = Object.keys(signal);
   
       let unknown = [];
       Object.keys(obj).forEach(key => {
           if (keys.indexOf(key)==-1) unknown.push(key);
       })
       if (unknown.length>0) warn(`unknown fields: ${unknown}`)
   
       // ---------------------------
       // run first layer of triggers
       // ---------------------------
   
       let queue = [];
       keys.forEach(key => {
           let item = run(name,key,obj[key],err);
           if (item) queue.push(item);
       })
   
       process(queue);
       
   }
   