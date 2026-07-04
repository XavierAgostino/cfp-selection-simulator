import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  extractBetaCode,
  getConfiguredBetaCodes,
  isBetaAccessConfigured,
  timingSafeEqualString,
  validateBetaAccessCode,
} from "@/lib/runtime/beta-access";

describe("beta access", () => {
  const originalSingle = process.env.SELECTION_ROOM_BETA_ACCESS_CODE;
  const originalMulti = process.env.SELECTION_ROOM_BETA_RUN_CODES;

  beforeEach(() => {
    delete process.env.SELECTION_ROOM_BETA_ACCESS_CODE;
    delete process.env.SELECTION_ROOM_BETA_RUN_CODES;
  });

  afterEach(() => {
    if (originalSingle === undefined) {
      delete process.env.SELECTION_ROOM_BETA_ACCESS_CODE;
    } else {
      process.env.SELECTION_ROOM_BETA_ACCESS_CODE = originalSingle;
    }
    if (originalMulti === undefined) {
      delete process.env.SELECTION_ROOM_BETA_RUN_CODES;
    } else {
      process.env.SELECTION_ROOM_BETA_RUN_CODES = originalMulti;
    }
  });

  it("loads a single beta code from SELECTION_ROOM_BETA_ACCESS_CODE", () => {
    process.env.SELECTION_ROOM_BETA_ACCESS_CODE = "secret-one";
    expect(getConfiguredBetaCodes()).toEqual(["secret-one"]);
    expect(isBetaAccessConfigured()).toBe(true);
  });

  it("loads comma-separated codes from SELECTION_ROOM_BETA_RUN_CODES", () => {
    process.env.SELECTION_ROOM_BETA_RUN_CODES = " alpha , beta ";
    expect(getConfiguredBetaCodes()).toEqual(["alpha", "beta"]);
    expect(validateBetaAccessCode("beta")).toBe(true);
    expect(validateBetaAccessCode("gamma")).toBe(false);
  });

  it("prefers SELECTION_ROOM_BETA_RUN_CODES over the single-code env", () => {
    process.env.SELECTION_ROOM_BETA_ACCESS_CODE = "legacy";
    process.env.SELECTION_ROOM_BETA_RUN_CODES = "multi";
    expect(getConfiguredBetaCodes()).toEqual(["multi"]);
  });

  it("rejects missing or invalid beta codes", () => {
    process.env.SELECTION_ROOM_BETA_ACCESS_CODE = "expected";
    expect(validateBetaAccessCode(null)).toBe(false);
    expect(validateBetaAccessCode("")).toBe(false);
    expect(validateBetaAccessCode("wrong")).toBe(false);
    expect(validateBetaAccessCode("expected")).toBe(true);
  });

  it("uses timing-safe comparison", () => {
    expect(timingSafeEqualString("abc", "abc")).toBe(true);
    expect(timingSafeEqualString("abc", "abd")).toBe(false);
  });

  it("extracts beta code from header or body", () => {
    const headerRequest = {
      get: (name: string) =>
        name.toLowerCase() === "x-selection-room-beta-code" ? " header-code " : null,
    };
    expect(extractBetaCode(headerRequest, {})).toBe("header-code");

    const bodyRequest = { get: () => null };
    expect(extractBetaCode(bodyRequest, { beta_code: " body-code " })).toBe("body-code");
    expect(extractBetaCode(bodyRequest, {})).toBeNull();
  });

  it("never exposes configured codes through validation helpers", () => {
    process.env.SELECTION_ROOM_BETA_ACCESS_CODE = "do-not-leak";
    const codes = getConfiguredBetaCodes();
    expect(JSON.stringify(codes)).not.toContain("capabilities");
    expect(validateBetaAccessCode("do-not-leak")).toBe(true);
  });
});
