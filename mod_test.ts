import { AssertionError } from "https://deno.land/std@0.202.0/assert/assertion_error.ts";
import { assertExists, assertInstanceOf, assert, fail } from "https://deno.land/std@0.202.0/assert/mod.ts";
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
    return [...Deno.readDirSync(root)]
        .filter((dir) => dir.isFile && dir.name.endsWith(FILE_EXTENSION))
        .sort((a, b) => b.name.localeCompare(a.name));
}

function getLatestModule(root: string): Deno.DirEntry {
    return getFilesFromDirectory(root)[0];
}

function validateTestShape(testObj: any):boolean {
    const result = testSchema.safeParse(testObj);
    if (!result.success) console.log(result.error.issues);
    return result.success;
}

Deno.test("Getting latest module", async (t) => {

    const latest = getLatestModule(SRC_DIR).name;
    const modPath = `${SRC_DIR}/${latest}`;

    const modTs = await Deno.readTextFile(modPath).catch(handleError);

    await t.step("latest module should exist", () => {
        assertExists(modTs);
    })

    const mod = await import(modPath).catch(handleError);

    await t.step("module should export an auto function", () => {
        assertExists(mod.auto);
        assertInstanceOf(mod.auto, Function);
    })

    for (const test of getFilesFromDirectory(TEST_DIR)) {

        await t.step(`running test ${test.name}`, async () => {

            const testPath = `${TEST_DIR}/${test.name}`;
            const testMod = await import(testPath).catch(handleError);

            assertExists(testMod.default);
            assertInstanceOf(testMod.default, Object);


            try {
                if (!validateTestShape(testMod.default)) fail("test shape is invalid");
            }
            catch (error) {
                const newError = new AssertionError(error.message);
                Error.captureStackTrace(newError, newError.constructor); // capture the stack trace
                throw newError; // re-throw the error without the stack trace
            }

            const result = mod.auto(testMod.default);
            assertExists(result);
        })
    }
});
