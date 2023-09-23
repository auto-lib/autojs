import { assertExists } from "https://deno.land/std@0.202.0/assert/mod.ts";
import { assertInstanceOf } from "https://deno.land/std@0.202.0/assert/assert_instance_of.ts";

function getLatestMod(root: string): Deno.DirEntry {
  const dirs = [...Deno.readDirSync(root)]
    .filter((dir) => dir.isFile && dir.name.endsWith(".ts"))
    .sort((a, b) => b.name > a.name ? 1 : -1);
  return dirs[0];
}

Deno.test("mod.ts should exist", async (t) => {

  const root = "./src";
  const latest = getLatestMod(root).name;
  const modPath = `${root}/${latest}`;
  console.log("reading latest mod from:", modPath);
  const modTs = await Deno.readTextFile(modPath).catch(console.error);
  assertExists(modTs);

  await t.step("mod.ts should export auto function", async () => {
    const mod = await import(`${modPath}`);
    assertExists(mod.auto);
    assertInstanceOf(mod.auto, Function);
    const auto = mod.auto;
    const _ = auto({});
  });
});