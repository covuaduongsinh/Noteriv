import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { MemoryVaultAdapter } from "@noteriv/core/memory-vault-adapter";
import type { CorePluginDef, PluginStateStore } from "@noteriv/core/plugin-registry";
import { getCodeBlockProcessor } from "@noteriv/core/markdown-code-block-registry";
import {
  createCorePluginHost,
  CorePluginsSection,
  listVaultEntries,
  settingsKeyStateStore,
  useCorePlugins,
  type CorePluginHost,
} from "../src/plugins";

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function memoryStore(initial: Record<string, boolean> = {}): PluginStateStore {
  let state = { ...initial };
  return { load: async () => ({ ...state }), save: async (s) => void (state = { ...s }) };
}

const editor = {
  getContent: () => "hello world",
  setContent: vi.fn(),
  insertAtCursor: vi.fn(),
  getSelection: () => "",
  replaceSelection: vi.fn(),
  getCursorPosition: () => ({ line: 1, ch: 0 }),
};

function makeHost(plugins: CorePluginDef<PluginApi>[], opts: { adapter?: MemoryVaultAdapter; store?: PluginStateStore } = {}) {
  const notify = vi.fn();
  const settings: Record<string, Record<string, unknown>> = {};
  const host = createCorePluginHost({
    adapter: opts.adapter ?? new MemoryVaultAdapter(),
    platform: "web",
    vaultPath: null,
    editor,
    getCurrentFile: () => "a.md",
    openFile: async () => true,
    notify,
    loadPluginSettings: async (id) => settings[id] ?? {},
    savePluginSettings: async (id, data) => void (settings[id] = data),
    stateStore: opts.store ?? memoryStore(),
    plugins,
  });
  return { host, notify, settings };
}

function def(id: string, plugin: CorePlugin): CorePluginDef<PluginApi> {
  return { id, name: id, description: `${id} plugin`, load: async () => ({ default: plugin }) };
}

describe("core plugin host", () => {
  it("collects a plugin's contributions under namespaced keys and removes them all on disable", async () => {
    const ran = vi.fn();
    const { host } = makeHost([
      def("demo", {
        onload(api) {
          api.ui.addCommand({ id: "go", name: "Go", hotkey: "Mod+G", callback: ran });
          api.ui.addStatusBarItem({ id: "s", text: "3 words" });
          api.ui.addRibbonIcon({ id: "r", title: "Ribbon", onClick: ran });
          api.ui.registerView("demo-view", () => ({ mount: () => undefined }));
          api.ui.addSidebarPanel({ id: "p", title: "Panel", icon: "x", render: () => undefined });
          api.markdown.registerCodeBlockProcessor("demo-lang", () => undefined);
        },
      }),
    ]);
    await host.registry.setEnabled("demo", true);
    const c = host.getContributions();
    expect(c.commands.map((x) => [x.key, x.hotkey])).toEqual([["demo:go", "Mod+G"]]);
    expect(c.statusItems.map((x) => x.text)).toEqual(["3 words"]);
    expect(c.ribbonIcons.map((x) => x.key)).toEqual(["demo:r"]);
    expect(c.sidebarPanels.map((x) => x.key)).toEqual(["demo:p"]);
    expect(c.viewTypes).toEqual(["demo-view"]);
    expect(getCodeBlockProcessor("demo-lang")?.pluginId).toBe("demo");
    c.commands[0].run();
    c.ribbonIcons[0].onClick();
    expect(ran).toHaveBeenCalledTimes(2);

    await host.registry.setEnabled("demo", false);
    const after = host.getContributions();
    expect([after.commands, after.statusItems, after.ribbonIcons, after.sidebarPanels, after.viewTypes].every((l) => l.length === 0)).toBe(true);
    expect(host.getView("demo-view")).toBeUndefined();
    expect(getCodeBlockProcessor("demo-lang")).toBeUndefined();
  });

  it("delivers app events only while the plugin runs, and isolates handler errors", async () => {
    const seen: unknown[] = [];
    const { host } = makeHost([
      def("bad", {
        onload(api) {
          api.events.on("file-open", () => {
            throw new Error("handler boom");
          });
        },
      }),
      def("good", {
        onload(api) {
          api.events.on("file-open", (p) => seen.push(p));
        },
      }),
    ]);
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await host.registry.setEnabled("bad", true);
    await host.registry.setEnabled("good", true);
    host.emit("file-open", "a.md");
    await host.registry.setEnabled("good", false);
    host.emit("file-open", "b.md");
    expect(seen).toEqual(["a.md"]);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("implements the vault API by path on top of the VaultAdapter", async () => {
    const adapter = new MemoryVaultAdapter({ "notes/a.md": "A", "notes/deep/b.md": "B", "root.md": "R" });
    let api!: PluginApi;
    const { host } = makeHost([def("v", { onload: (a) => void (api = a) })], { adapter });
    await host.registry.setEnabled("v", true);
    expect(await api.vault.read("notes/a.md")).toBe("A");
    expect(await api.vault.read("missing.md")).toBeNull();
    expect(await api.vault.exists("root.md")).toBe(true);
    await api.vault.write("notes/a.md", "A2");
    expect(await api.vault.read("notes/a.md")).toBe("A2");
    await api.vault.write("new.md", "N");
    expect(await api.vault.read("new.md")).toBe("N");
    expect(await api.vault.list("notes")).toEqual([
      { path: "notes/deep", name: "deep", isDir: true },
      { path: "notes/a.md", name: "a.md", isDir: false },
    ]);
    expect(await api.vault.delete("root.md")).toBe(true);
    expect(await api.vault.delete("root.md")).toBe(false);
  });

  it("passes editor, settings, notices and app info through", async () => {
    let api!: PluginApi;
    const { host, notify, settings } = makeHost([def("x", { onload: (a) => void (api = a) })]);
    await host.registry.setEnabled("x", true);
    expect(api.editor.getContent()).toBe("hello world");
    api.ui.showNotice("hi", 100);
    expect(notify).toHaveBeenCalledWith("hi", 100);
    await api.settings.save({ theme: "dark" });
    expect(settings.x).toEqual({ theme: "dark" });
    expect(await api.app.loadSettings()).toEqual({ theme: "dark" });
    expect(api.app.platform).toBe("web");
    expect(api.app.currentFile).toBe("a.md");
    expect(await api.workspace.openView("none")).toBe(false);
  });

  it("removes contributions made before onload failed", async () => {
    const { host } = makeHost([
      def("half", {
        onload(api) {
          api.ui.addCommand({ id: "c", name: "C", callback: () => undefined });
          throw new Error("late failure");
        },
      }),
    ]);
    await host.registry.setEnabled("half", true);
    expect(host.registry.list()[0].status).toBe("error");
    expect(host.getContributions().commands).toEqual([]);
  });
});

describe("listVaultEntries", () => {
  it("lists the vault root with folders first", () => {
    const notes = [
      { id: "1", path: "z.md", name: "z.md" },
      { id: "2", path: "a/b.md", name: "b.md" },
    ];
    expect(listVaultEntries(notes)).toEqual([
      { path: "a", name: "a", isDir: true },
      { path: "z.md", name: "z.md", isDir: false },
    ]);
  });
});

describe("settingsKeyStateStore", () => {
  it("keeps the other settings keys when saving", async () => {
    let blob: Record<string, unknown> = { theme: "dark" };
    const store = settingsKeyStateStore(async () => blob, async (s) => void (blob = s));
    expect(await store.load()).toEqual({});
    await store.save({ "word-count": true });
    expect(blob).toEqual({ theme: "dark", corePlugins: { "word-count": true } });
    expect(await store.load()).toEqual({ "word-count": true });
  });
});

describe("CorePluginsSection with useCorePlugins", () => {
  function Harness({ host }: { host: CorePluginHost }) {
    const { plugins, contributions, setEnabled } = useCorePlugins(host);
    return createElement(
      "div",
      null,
      createElement(CorePluginsSection, { plugins, onToggle: (id, on) => void setEnabled(id, on) }),
      createElement("output", null, contributions.statusItems.map((s) => s.text).join(","))
    );
  }

  it("toggles a plugin from the switch and re-renders its contributions", async () => {
    const { host } = makeHost([
      def("wc", {
        onload(api) {
          api.ui.addStatusBarItem({ id: "n", text: "42 words" });
        },
      }),
    ]);
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => root.render(createElement(Harness, { host })));
    const toggle = el.querySelector<HTMLButtonElement>('[data-core-plugin="wc"] button[role="switch"]')!;
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(el.querySelector("output")!.textContent).toBe("");

    await act(async () => {
      toggle.click();
      await host.registry.setEnabled("wc", true); // wait for the queued enable to settle
    });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(el.querySelector("output")!.textContent).toBe("42 words");

    await act(async () => {
      toggle.click();
      await host.registry.setEnabled("wc", false);
    });
    expect(el.querySelector("output")!.textContent).toBe("");
    await act(async () => root.unmount());
    el.remove();
  });
});
