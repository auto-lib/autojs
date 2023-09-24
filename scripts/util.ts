
import { z } from "https://deno.land/x/zod@v3.20.0/mod.ts";

const FILE_EXTENSION = ".ts";
const SRC_DIR = "../src";

export const testSchema = z.object({
    obj: z.object({}),
    fn: z.function(),
});

export function handleError(error: unknown): void {
    console.error("An error occurred:", error);
}

export function getFilesFromDirectory(root: string): Deno.DirEntry[] {
    console.log(' - getting files from', root);
    return [...Deno.readDirSync(root)]
        .filter((dir) => dir.isFile && dir.name.endsWith(FILE_EXTENSION))
        .sort((a, b) => b.name.localeCompare(a.name));
}

export function getLatestModule(): Deno.DirEntry {
    console.log(' - getting latest module from', SRC_DIR);
    return getFilesFromDirectory(SRC_DIR)[0];
}

export function validateTestShape(testObj: Record<string, unknown>): boolean {
    const result = testSchema.safeParse(testObj);
    if (!result.success) console.log('\nERROR: test shape wrong\n\n', testObj, '\n\n', result.error.issues, '\n');
    return result.success;
}
