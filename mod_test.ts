import { assertExists, assertInstanceOf, assertEquals } from "https://deno.land/std@0.202.0/assert/mod.ts";
import { z } from "https://deno.land/x/zod@v3.16.1/mod.ts";

const testSchema = z.object({
  obsj: z.object({}),
  fn: z.function(),
})

function getLatestMod(root: string): Deno.DirEntry {
  const dirs = [...Deno.readDirSync(root)]
    .filter((dir) => dir.isFile && dir.name.endsWith(".ts"))
    .sort((a, b) => b.name > a.name ? 1 : -1);
  return dirs[0];
}

function getTests(root: string): Deno.DirEntry[] {
  return [...Deno.readDirSync(root)]
    .filter((dir) => dir.isFile && dir.name.endsWith(".ts"))
    .sort((a, b) => b.name > a.name ? 1 : -1);
}

Deno.test("mod.ts should exist", async (t) => {

  const src = "./src";
  const tests = './tests';

  const latest = getLatestMod(src).name;
  const modPath = `${src}/${latest}`;
  console.log("reading latest mod from:", modPath);
  const modTs = await Deno.readTextFile(modPath).catch(console.error);
  assertExists(modTs);

  await t.step("mod.ts should export auto function", async () => {
    const mod = await import(`${modPath}`);
    assertExists(mod.auto);
    assertInstanceOf(mod.auto, Function);
    const auto = mod.auto;
    
    console.log("reading latest test from:", tests);
    for(const test of getTests(tests)) {

      const testPath = `${tests}/${test.name}`;
      // const testTs = await Deno.readTextFile(testPath).catch(console.error);
      // assertExists(testTs);

      const testMod = await import(`${testPath}`).catch(console.error);
      assertExists(testMod.default);
      assertInstanceOf(testMod.default, Object);
      const testObj = testMod.default;

      console.log('trying to parse');
      let passed = true;

        try {
          console.log('trying to parse...');
          testSchema.parse(testObj);
        }
        catch(e) {
          console.error('ERROR', e);
          passed = false;
          // throw e;
        }    

      assertEquals(passed, true);

      await t.step(`test ${test.name} should pass`, async () => {
        const result = auto(testObj);
        assertExists(result);
      });
    }
    getTests(tests).forEach(async (test) => {

      console.log("reading test:", test.name);

      const testPath = `${tests}/${test.name}`;
      const testTs = await Deno.readTextFile(testPath).catch(console.error);
      assertExists(testTs);

      const testMod = await import(`${testPath}`);
      assertExists(testMod.default);
      assertInstanceOf(testMod.default, Object);
      const testObj = testMod.default;

      await t.step(`test ${test.name} should be valid shape`, async () => {
        assertEquals(testSchema.safeParse(testObj).success, true);
      })

      await t.step(`test ${test.name} should pass`, async () => {
        const result = auto(testObj);
        assertExists(result);
      });
    })

  });
});