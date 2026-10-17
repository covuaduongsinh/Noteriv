import { describe, expect, it } from "vitest";
import { isConflictCopy, parseConflictCopy } from "../src/conflict-copy";

describe("parseConflictCopy", () => {
  it("finds the original note of a conflict copy", () => {
    expect(parseConflictCopy("a (conflict 2026-10-17 0153).md")).toEqual({ originalPath: "a.md", stamp: "2026-10-17 01:53" });
  });

  it("keeps folders and handles numbered copies", () => {
    expect(parseConflictCopy("notes/sub/plan (conflict 2026-01-02 0304 2).md")).toEqual({
      originalPath: "notes/sub/plan.md",
      stamp: "2026-01-02 03:04",
    });
  });

  it("handles names with spaces, dots and parentheses", () => {
    expect(parseConflictCopy("Meeting (draft) v1.2 (conflict 2026-10-17 0153).md")?.originalPath).toBe("Meeting (draft) v1.2.md");
  });

  it("works for files without an extension and for attachments", () => {
    expect(parseConflictCopy("README (conflict 2026-10-17 0153)")?.originalPath).toBe("README");
    expect(parseConflictCopy("attachments/pic (conflict 2026-10-17 0153).png")?.originalPath).toBe("attachments/pic.png");
  });

  it("ignores ordinary notes and look-alikes", () => {
    expect(parseConflictCopy("a.md")).toBeNull();
    expect(parseConflictCopy("a (conflict).md")).toBeNull();
    expect(parseConflictCopy("a (conflict 2026-10-17).md")).toBeNull();
    expect(isConflictCopy("notes/a (conflict 2026-10-17 0153).md")).toBe(true);
    expect(isConflictCopy("notes/a.md")).toBe(false);
  });
});
