import { build, emptyDir } from "https://deno.land/x/dnt@0.38.1/mod.ts";
import { getLatestModule, runTestsExitIfError } from "./util.ts";
import { existsSync } from "https://deno.land/std@0.202.0/fs/mod.ts";
import { runTests } from "./test.ts";

if (!Deno.args[0]) {
  console.error("Please provide a version number");
  Deno.exit(1);
}

const MOD_PATH = './mod.ts';

await runTests();

Deno.exit(1);

const latest = getLatestModule();

if (existsSync(MOD_PATH)) Deno.removeSync(MOD_PATH);

await emptyDir("../npm");

await build({

  entryPoints: [MOD_PATH],
  outDir: "./npm",
  testPattern: "", // disable tests
  shims: {
    deno: true,
  },
  package: {
    name: "@auto-lib/autojs",
    version: Deno.args[0],
    description:
      "Automatic javascript",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/auto-lib/autojs.git",
    },
    bugs: {
      url: "https://github.com/auto-lib/autojs/issues",
    },
  },
  postBuild() {
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});

if (existsSync(MOD_PATH)) Deno.removeSync(MOD_PATH);