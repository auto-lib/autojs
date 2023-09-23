
import { assertInstanceOf } from "https://deno.land/std@0.202.0/assert/assert_instance_of.ts";
import { assertNotEquals } from "https://deno.land/std@0.202.0/assert/mod.ts";

Deno.test("mod.ts should exist", async (t) => {

  const mod_ts = await Deno.readFile("./mod.ts").catch((e) => console.error(e));
  assertNotEquals(mod_ts, undefined);

  await t.step("mod.ts should export auto function", async () => {

    const mod = await import("./mod.ts");

    assertNotEquals(mod.auto, undefined);
    assertInstanceOf(mod.auto, Function);

  })

});

