import { assertEquals } from "https://deno.land/std@0.202.0/testing/asserts.ts";
import { is42 } from "./mod.ts";

Deno.test("42 should return true", () => {
  assertEquals(true, is42(42));
});

Deno.test("1 should return false", () => {
  assertEquals(false, is42(1));
});
