
import { assertInstanceOf } from "https://deno.land/std@0.202.0/assert/assert_instance_of.ts";
import { assertNotEquals } from "https://deno.land/std@0.202.0/assert/mod.ts";

function get_latest_mod(root:string) {
  let dirs: Deno.DirEntry[] = [];
  for (const dirEntry of Deno.readDirSync(root)) dirs.push(dirEntry);
  // sort
  dirs.sort((a, b) => {
    if (a.name < b.name) return -1;
    else if (a.name > b.name) return 1;
    else return 0;
  });
  // filter by .ts
  dirs = dirs.filter((dirEntry) => dirEntry.name.endsWith(".ts"));

  // get latest
  return dirs[dirs.length - 1];
}

Deno.test("mod.ts should exist", async (t) => {

  const root = './src';

  const lastest = get_latest_mod(root).name;

  const mod_path = `${root}/${lastest}`;

  console.log("reading latest mod from:", mod_path);

  const mod_ts = await Deno.readFile(mod_path).catch((e) => console.error(e));
  assertNotEquals(mod_ts, undefined);

  await t.step("mod.ts should export auto function", async () => {

    const mod = await import("./mod.ts");

    assertNotEquals(mod.auto, undefined);
    assertInstanceOf(mod.auto, Function);

  })

});

