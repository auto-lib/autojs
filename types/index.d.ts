type FunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
  }[keyof T];
  
  type FunctionReturnTypes<T> = {
    [K in FunctionPropertyNames<T>]: T[K] extends (...args: any) => infer R ? R : never;
  };
  
  type DataProperties<T> = Omit<T, FunctionPropertyNames<T>>;
  
export type Reactive<T> = DataProperties<T> & FunctionReturnTypes<T>;

export type AutoOptions = {
  watch?: Object,
  report_lag?: number,
  tests?: Object,
  tag?: string,
}

type SubscribeFunction = (value: any) => void;

type HashObject<T> = {
  [K in keyof T]: {
    subscribe: SubscribeFunction;
  };
};

export type Auto<T> = Reactive<T> & {
  '#': HashObject<T>
}


export default function auto<T>(obj:T, options?:AutoOptions):Auto<T>;