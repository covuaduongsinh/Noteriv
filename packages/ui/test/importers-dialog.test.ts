import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { readPicked } from "../src/importers/input";
import AppImport from "../src/panels/AppImport";
import type { ImportResult } from "../src/importers/types";

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const wait = () => act(async () => new Promise((r) => setTimeout(r, 20)));

async function zipOf(files: Record<string, string | Uint8Array>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [path, data] of Object.entries(files)) zip.file(path, data);
  return zip.generateAsync({ type: "uint8array" });
}

describe("readPicked", () => {
  it("opens zips (and a zip inside one, as Notion splits big exports), dropping the shared top folder", async () => {
    const inner = await zipOf({ "Export/Part/B 0123456789abcdef0123456789abcdef.md": "# B" });
    const outer = await zipOf({ "Export/A.md": "# A", "Export/Part-2.zip": inner, "__MACOSX/._A.md": "x" });
    const files = await readPicked([new File([outer as BlobPart], "Export.zip")]);
    expect(files.map((f) => f.path)).toEqual(["A.md", "Part/B 0123456789abcdef0123456789abcdef.md"]);
    expect(await files[0].text()).toBe("# A");
  });

  it("strips a folder all picked files share", async () => {
    const pick = (path: string) => Object.assign(new File(["x"], path.split("/").pop()!), { webkitRelativePath: path });
    const files = await readPicked([pick("Takeout/Keep/a.html"), pick("Takeout/Keep/b.html")]);
    expect(files.map((f) => f.path)).toEqual(["a.html", "b.html"]);
  });
});

describe("AppImport", () => {
  it("reads the picked export, shows what it found, and writes it into the chosen folder", async () => {
    const write = vi.fn(async (r: ImportResult, progress: (d: number, t: number) => void) => {
      progress(r.notes.length, r.notes.length);
      return { written: r.notes.length, kept: 0, failed: [] };
    });
    const onOpen = vi.fn();
    const host = document.body.appendChild(document.createElement("div"));
    const root = createRoot(host);
    await act(async () => root.render(createElement(AppImport, { write, onClose: () => {}, onOpen })));

    // Evernote, one .enex picked.
    await act(async () => host.querySelectorAll<HTMLInputElement>(".aimp-source input")[1].click());
    const enex = `<?xml version="1.0"?><en-export><note><title>Hello</title><content><![CDATA[<en-note><div>Hi</div></en-note>]]></content></note></en-export>`;
    const input = host.querySelector<HTMLInputElement>("[data-testid=aimp-file]")!;
    Object.defineProperty(input, "files", { value: [new File([enex], "Book.enex")], configurable: true });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    await wait();
    expect(host.querySelector(".aimp-summary")?.textContent).toContain("Found 1 notes and 0 attachments.");

    const folder = host.querySelector<HTMLInputElement>(".aimp-folder input")!;
    expect(folder.value).toBe("Evernote");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(folder, "Old notes");
      folder.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => host.querySelector<HTMLButtonElement>(".aimp-primary")!.click());
    await wait();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0].notes.map((n) => n.path)).toEqual(["Old notes/Hello.md"]);
    expect(host.textContent).toContain("Imported 1 item.");

    await act(async () => host.querySelector<HTMLButtonElement>(".aimp-primary")!.click());
    expect(onOpen).toHaveBeenCalledWith("Old notes/Hello.md");
    act(() => root.unmount());
  });
});
