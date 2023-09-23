
type Auto<T> = T;

export function auto<T>(obj?: T): Auto<T> {
  return obj as Auto<T>;
}