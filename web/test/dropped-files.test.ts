import { describe, expect, it } from "vitest";
import { droppedFiles, isFileDrag } from "@/lib/dropped-files";

type Entry = { isFile: boolean } | null;

/** A DataTransfer stand-in: jsdom has none, and only these members are read. */
function transfer(files: File[], opts: { types?: string[]; entries?: Entry[] } = {}): DataTransfer {
  const items = opts.entries
    ? files.map((file, i) => ({ kind: "file", getAsFile: () => file, webkitGetAsEntry: () => opts.entries![i] }))
    : undefined;
  return { types: opts.types ?? ["Files"], files, items } as unknown as DataTransfer;
}

const md = (name: string) => new File(["# x"], name);

describe("isFileDrag", () => {
  it("is true for files dragged in from the computer, false for a move inside the vault", () => {
    expect(isFileDrag(transfer([], { types: ["Files"] }))).toBe(true);
    expect(isFileDrag(transfer([], { types: ["application/x-noteriv-node"] }))).toBe(false);
    expect(isFileDrag(null)).toBe(false);
  });
});

describe("droppedFiles", () => {
  it("returns the dropped files", () => {
    expect(droppedFiles(transfer([md("a.md"), md("b.md")])).map((f) => f.name)).toEqual(["a.md", "b.md"]);
  });

  it("leaves out dropped folders, which the browser hands over as empty files", () => {
    const dt = transfer([md("a.md"), md("Folder")], { entries: [{ isFile: true }, { isFile: false }] });
    expect(droppedFiles(dt).map((f) => f.name)).toEqual(["a.md"]);
  });

  it("keeps a file whose entry the browser cannot give", () => {
    const dt = transfer([md("a.md")], { entries: [null] });
    expect(droppedFiles(dt).map((f) => f.name)).toEqual(["a.md"]);
  });
});
