import { assertEquals, assertExists, assertInstanceOf, fail } from "https://deno.land/std@0.202.0/assert/mod.ts";
import { getFilesFromDirectory, getLatestModulePath, handleError, validateTestShape } from "./util.ts";

const TEST_DIR = "../tests";

function convertToArrays(obj: Record<string, unknown>, keys:string[]): Record<string, unknown>
{
    const result: Record<string, unknown> = {};

    for (const key in obj) {
        if (keys.includes(key)) 
            result[key] = Object.keys(obj[key] as object);
        else 
            result[key] = obj[key];
    }

    return result;
}

export async function runTests()
{
    console.log('\nRunning tests\n');

    const modPath = getLatestModulePath();

    console.log(' - importing auto from', modPath);

    const modTs = await Deno.readTextFile(modPath).catch(handleError);
    assertExists(modTs);

    const mod = await import(modPath).catch(handleError);

    assertExists(mod.auto);
    assertInstanceOf(mod.auto, Function);

    const test_files = getFilesFromDirectory(TEST_DIR).reverse();

    console.log();

    for (const test of test_files) {

        if (test.name == 'types.d.ts') continue;

        console.log(`* ${test.name.replace('.ts', '')}`);

        const testPath = `${TEST_DIR}/${test.name}`;
        const testMod = await import(testPath).catch(handleError);

        if (!testMod.default) fail("test module has no default export");
        assertInstanceOf(testMod.default, Object);

        if (!validateTestShape(testMod.default)) fail("test shape is invalid");

        const result = mod.auto(testMod.default);
        assertExists(result);

        const obj = convertToArrays(result._, ['fn', 'subs']);
        assertEquals(obj, testMod.default._);
    
    }

    console.log('\nAll tests passed!\n');
}

if (import.meta.main) runTests();