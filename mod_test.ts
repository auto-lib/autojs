import { assertExists, assertInstanceOf, fail } from "https://deno.land/std@0.202.0/assert/mod.ts";
import { z } from "https://deno.land/x/zod@v3.20.0/mod.ts";

const FILE_EXTENSION = ".ts";
const SRC_DIR = "./src";
const TEST_DIR = "./tests";

const testSchema = z.object({
    obsj: z.object({}),
    fn: z.function(),
});

function handleError(error: any): void {
    console.error("An error occurred:", error);
}

function getFilesFromDirectory(root: string): Deno.DirEntry[] {
    console.log(' - getting files from', root);
    return [...Deno.readDirSync(root)]
        .filter((dir) => dir.isFile && dir.name.endsWith(FILE_EXTENSION))
        .sort((a, b) => b.name.localeCompare(a.name));
}

function getLatestModule(root: string): Deno.DirEntry {
    console.log(' - getting latest module from', root);
    return getFilesFromDirectory(root)[0];
}

function validateTestShape(testObj: Record<string, any>): boolean {
    const result = testSchema.safeParse(testObj);
    if (!result.success) console.log('\nERROR: test shape wrong\n\n', testObj, '\n\n', result.error.issues, '\n');
    return result.success;
}

console.log();

const latest = getLatestModule(SRC_DIR).name;
const modPath = `${SRC_DIR}/${latest}`;

console.log(' - importing module from', modPath);

const modTs = await Deno.readTextFile(modPath).catch(handleError);
assertExists(modTs);

const mod = await import(modPath).catch(handleError);

assertExists(mod.auto);
assertInstanceOf(mod.auto, Function);

const test_files = getFilesFromDirectory(TEST_DIR);

console.log();

for (const test of test_files) {

    console.log(`[${test.name}]`);

    try {

        const testPath = `${TEST_DIR}/${test.name}`;
        const testMod = await import(testPath).catch(handleError);

        if (!testMod.defdault) fail("test module has no default export");
        assertInstanceOf(testMod.default, Object);

        if (!validateTestShape(testMod.default)) fail("test shape is invalid");

        const result = mod.auto(testMod.default);
        assertExists(result);

    }
    catch (error) { console.log('\n -- error', error); }
}

