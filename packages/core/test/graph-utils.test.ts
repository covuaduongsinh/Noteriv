import { describe, expect, it } from "vitest";
import { buildLinkGraph } from "../src/graph-utils";
import type { NoteRef } from "../src/vault-adapter";

const ref = (path: string): NoteRef => ({ id: path, path, name: path.split("/").pop()! });
const notes = [ref("A.md"), ref("dir/B.md"), ref("C.md"), ref("D.md")];

function graph(contents: Record<string, string>) {
  return buildLinkGraph(notes, new Map(Object.entries(contents)));
}

describe("buildLinkGraph", () => {
  it("makes one edge per linked pair, marking the pair reciprocal when both directions exist", () => {
    const g = graph({ "A.md": "to [[B]]", "dir/B.md": "back [[A]] and on [[C]]", "C.md": "", "D.md": "" });
    expect(g.edges).toEqual([
      { source: "A.md", target: "dir/B.md", reciprocal: true },
      { source: "dir/B.md", target: "C.md", reciprocal: false },
    ]);
    expect(g.connections.get("A.md")).toBe(1);
    expect(g.connections.get("dir/B.md")).toBe(2);
    expect(g.connections.get("C.md")).toBe(1);
    expect(g.connections.has("D.md")).toBe(false);
  });

  it("resolves aliases and case, ignores unknown targets, self links and repeats", () => {
    const g = graph({ "A.md": "[[b|alias]] [[B]] [[Nope]] [[A]]", "dir/B.md": "", "C.md": "", "D.md": "" });
    expect(g.edges).toEqual([{ source: "A.md", target: "dir/B.md", reciprocal: false }]);
  });

  it("treats a note without content as having no links, and an empty vault as an empty graph", () => {
    expect(graph({}).edges).toEqual([]);
    expect(buildLinkGraph([], new Map()).edges).toEqual([]);
  });
});
