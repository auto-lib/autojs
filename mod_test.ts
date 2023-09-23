import { assertNotEquals } from "https://deno.land/std@0.202.0/assert/mod.ts";
// import { auto } from "./mod.ts";

Deno.test("mod.ts should exist", async () => {
  const mod_ts = await Deno.readFile("./mod.ts").catch((e) => console.error(e));
  assertNotEquals(mod_ts, undefined);
});

