import { describe, it, expect } from "vitest";
import { extractActions, safeCalculate } from "@/lib/aria-actions";

describe("extractActions", () => {
  it("extracts open_app with valid app", () => {
    const { cleanText, actions } = extractActions("Opening YouTube.\n[ACTION:open_app|youtube]");
    expect(cleanText).toBe("Opening YouTube.");
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: "open_app", app: "youtube" });
  });

  it("ignores unknown app", () => {
    const { actions } = extractActions("[ACTION:open_app|nonexistentapp]");
    expect(actions).toHaveLength(0);
  });

  it("blocks unsafe protocols", () => {
    const { actions } = extractActions("[ACTION:open_url|javascript:alert(1)]");
    expect(actions).toHaveLength(0);
  });

  it("auto-prefixes https://", () => {
    const { actions } = extractActions("[ACTION:open_url|github.com]");
    expect(actions).toHaveLength(1);
    expect((actions[0] as any).url).toMatch(/^https:\/\/github\.com/);
  });

  it("encodes search queries", () => {
    const { actions } = extractActions("[ACTION:search_google|hello world]");
    expect((actions[0] as any).url).toContain("hello%20world");
  });

  it("dedupes identical actions", () => {
    const { actions } = extractActions("[ACTION:open_app|github][ACTION:open_app|github]");
    expect(actions).toHaveLength(1);
  });

  it("supports multiple distinct actions", () => {
    const { actions } = extractActions("[ACTION:open_app|github][ACTION:open_app|gmail]");
    expect(actions).toHaveLength(2);
  });

  it("strips action tags from cleanText", () => {
    const { cleanText } = extractActions("Hello [ACTION:time|] world");
    expect(cleanText).not.toContain("ACTION");
  });

  it("returns empty actions when none present", () => {
    const { actions } = extractActions("Just a normal message");
    expect(actions).toHaveLength(0);
  });
});

describe("safeCalculate", () => {
  it("evaluates basic math", () => {
    expect(safeCalculate("2+2")).toBe("4");
    expect(safeCalculate("(10*5)/2")).toBe("25");
  });

  it("rejects code injection", () => {
    expect(safeCalculate("alert(1)")).toBe("Invalid expression");
    expect(safeCalculate("process.exit()")).toBe("Invalid expression");
  });
});
