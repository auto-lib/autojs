import { build, emptyDir } from "https://deno.land/x/dnt@0.38.1/mod.ts";
import { runTestsExitIfError } from "./util.ts";

if (!Deno.args[0]) {
  console.error("Please provide a version number");
  Deno.exit(1);
}

await runTestsExitIfError();

await emptyDir("./npm");

await build({

  entryPoints: ["./mod.ts"],
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
