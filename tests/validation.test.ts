import { describe, expect, it } from "vitest";
import { loginSchema, profileSchema, registerSchema, usernameSchema } from "../src/lib/validation";

describe("NEXA validation", () => {
  it("normalizes usernames to lowercase", () => {
    expect(usernameSchema.parse("Luna_Azul")).toBe("luna_azul");
  });
  it("rejects usernames outside the allowed format", () => {
    expect(usernameSchema.safeParse("a b").success).toBe(false);
    expect(usernameSchema.safeParse("ab").success).toBe(false);
  });
  it("requires matching passwords", () => {
    expect(registerSchema.safeParse({ username:"luna", password:"long-password-123", confirmPassword:"other-password" }).success).toBe(false);
  });
  it("accepts valid registration payload", () => {
    expect(registerSchema.safeParse({ username:"luna_azul", password:"safe-password-123", confirmPassword:"safe-password-123" }).success).toBe(true);
  });
  it("normalizes login usernames", () => {
    expect(loginSchema.parse({ username:"LUNA", password:"x" }).username).toBe("luna");
  });
  it("limits profile bio length", () => {
    expect(profileSchema.safeParse({ displayName:"Luna", bio:"a".repeat(241) }).success).toBe(false);
  });
});