import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { NoteSearchHit, VaultAdapter } from "@noteriv/core/vault-adapter";
import { VaultSearch } from "../src/panels";

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  Element.prototype.scrollIntoView = () => {};
});

let root: Root | null = null;
let host: HTMLElement | null = null;
afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const ref = (path: string) => ({ id: `id:${path}`, path, name: path.split("/").pop()! });

async function typeInto(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("VaultSearch", () => {
  it("searches as you type, lists matching lines and opens the chosen one at its line", async () => {
    const hits: NoteSearchHit[] = [
      { ref: ref("a.md"), snippet: "x", matches: [{ line: 3, text: "hello world" }, { line: 9, text: "world again" }] },
      { ref: ref("b.md"), snippet: "<b>world</b> in b" }, // no line info: one row with the snippet
    ];
    const search = vi.fn(async () => hits);
    const onOpen = vi.fn();
    const onClose = vi.fn();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () =>
      root!.render(createElement(VaultSearch, { adapter: { search } as unknown as VaultAdapter, onOpen, onClose, debounceMs: 0 }))
    );

    const input = host.querySelector("input")!;
    await typeInto(input, "world");
    await act(async () => new Promise((r) => setTimeout(r, 10)));

    expect(search).toHaveBeenCalledWith("world");
    const options = host.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toContain(":3");
    expect(options[2].textContent).toContain("world in b"); // <b> tags stripped

    await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(onOpen).toHaveBeenCalledWith(hits[0].ref, 9);
    expect(onClose).toHaveBeenCalled();
  });
});
