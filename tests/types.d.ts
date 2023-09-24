type Obj = Record<string, unknown>;
type Fn = () => unknown;
type Ret = {
    fn: string[],
    subs: string[],
    deps: Record<string, Record<string, boolean>>,
    value: Record<string, unknown>,
    fatal: {
        msg?: string,
        stack?: string[]
    }
}