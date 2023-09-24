import { assertExists, assertInstanceOf, fail } from "https://deno.land/std@0.202.0/assert/mod.ts";
import { getFilesFromDirectory, getLatestModule, handleError, validateTestShape } from "./util.ts";

const TEST_DIR = "../tests";
const SRC_DIR = "../src";

export async function runTests()
{
    console.log();

    const latest = getLatestModule().name;
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

        const testPath = `${TEST_DIR}/${test.name}`;
        const testMod = await import(testPath).catch(handleError);

        if (!testMod.default) fail("test module has no default export");
        assertInstanceOf(testMod.default, Object);

        if (!validateTestShape(testMod.default)) fail("test shape is invalid");

        const result = mod.auto(testMod.default);
        assertExists(result);
    
    }

    console.log('\nAll tests passed!\n');
}

if (import.meta.main) runTests();