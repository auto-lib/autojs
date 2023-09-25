type Obj = Record<string, unknown>;
type Fn = () => unknown;
type Ret = {
    fn: string[],
    subs: string[],
    deps: Record<string, string[]>,
    value: Record<string, unknown>,
    fatal: {
        msg?: string,
        stack?: string[]
    }
}

type FunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
  }[keyof T];
  
  type FunctionReturnTypes<T> = {
    [K in FunctionPropertyNames<T>]: T[K] extends (...args: any) => infer R ? R : never;
  };
  
  type DataProperties<T> = Omit<T, FunctionPropertyNames<T>>;
  
type Reactive<T> = DataProperties<T> & FunctionReturnTypes<T>;
