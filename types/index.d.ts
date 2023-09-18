type FunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
  }[keyof T];
  
  type FunctionReturnTypes<T> = {
    [K in FunctionPropertyNames<T>]: T[K] extends (...args: any) => infer R ? R : never;
  };
  
  type DataProperties<T> = Omit<T, FunctionPropertyNames<T>>;
  
export type Reactive<T> = DataProperties<T> & FunctionReturnTypes<T>;

export type AutoOptions = {
  watch: Object,
  report_lag: number,
  tests: Object
}

export type Auto<T> = Reactive<T> & {
  '#': Reactive<T>
}