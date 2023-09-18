
import auto from './auto-es6';
import type { Reactive } from './types/index.d.ts';

type Obj = {
    name: string,
    msg: (obj: Reactive<Obj>) => string,
    data: (obj: Reactive<Obj>) => string
}

let obj:Obj = {
    name: 'karl',
    msg: _ => `Hello ${_.msg}!`,
    data: _ => _.name + _.msg
};

let _ = auto(obj);

_.name;