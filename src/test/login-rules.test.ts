import { describe, expect, it } from "vitest";
import { validateLogin } from "@/lib/login-modal";
describe("login form", () => {
  it("requires a username", () => expect(validateLogin(" ", "x").username).toBeTruthy());
  it("requires a password", () => expect(validateLogin("0700", "").password).toBeTruthy());
  it("accepts filled fields", () => expect(validateLogin("0700", "pw")).toEqual({}));
});
