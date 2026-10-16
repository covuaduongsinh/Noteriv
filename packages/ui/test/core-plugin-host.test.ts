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
  CorePluginNoteToolbarButtons,
  CorePluginSidePanels,
  CorePluginViewOverlay,
  listVaultEntries,
  settingsKeyStateStore,
  matchesHotkey,
  useCorePluginHost,
  useCorePluginHotkeys,
  useCorePlugins,
  type CorePluginHost,
  type CorePluginHostConfig,
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
  setCursor: vi.fn(),
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

  it("serves a vault scan from one note list, and drops it after a write", async () => {
    const adapter = new MemoryVaultAdapter({ "a.md": "A", "b.md": "B", "c/d.md": "D" });
    const listNotes = vi.spyOn(adapter, "listNotes");
    let api!: PluginApi;
    const { host } = makeHost([def("v", { onload: (a) => void (api = a) })], { adapter });
    await host.registry.setEnabled("v", true);
    await api.vault.list();
    await Promise.all(["a.md", "b.md", "c/d.md"].map((p) => api.vault.read(p)));
    expect(listNotes).toHaveBeenCalledTimes(1);
    await api.vault.write("e.md", "E");
    expect(await api.vault.exists("e.md")).toBe(true);
    expect(listNotes.mock.calls.length).toBeGreaterThan(1);
  });

  it("gives note dates by path and tells the app after a plugin changes the vault", async () => {
    const adapter = new MemoryVaultAdapter({ "a.md": "A", "b.md": "B" });
    adapter.setDates("a.md", { createdAt: 1, modifiedAt: 2 });
    const onVaultChanged = vi.fn();
    let api!: PluginApi;
    const host = createCorePluginHost({
      adapter,
      platform: "web",
      vaultPath: null,
      editor,
      getCurrentFile: () => null,
      openFile: async () => true,
      notify: vi.fn(),
      loadPluginSettings: async () => ({}),
      savePluginSettings: async () => undefined,
      stateStore: memoryStore(),
      plugins: [def("v", { onload: (a) => void (api = a) })],
      onVaultChanged,
    });
    await host.registry.setEnabled("v", true);
    expect(await api.vault.stats()).toEqual({ "a.md": { createdAt: 1, modifiedAt: 2 } });
    await api.vault.write("Daily/2026-10-16.md", "# day");
    await api.vault.delete("b.md");
    expect(onVaultChanged).toHaveBeenCalledTimes(2);
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

describe("plugin views (useCorePluginHost + CorePluginViewOverlay)", () => {
  it("opens a plugin view over the page, closes it on request, on Escape, and when the plugin is turned off", async () => {
    let api!: PluginApi;
    const cleanup = vi.fn();
    const plugin: CorePlugin = {
      onload(a) {
        api = a;
        a.ui.registerView("demo-view", () => ({
          mount(container, state) {
            const p = document.createElement("p");
            p.textContent = `view for ${state.path}`;
            container.appendChild(p);
            return cleanup;
          },
        }));
      },
    };
    const config: CorePluginHostConfig = {
      adapter: new MemoryVaultAdapter(),
      platform: "web",
      vaultPath: null,
      plugins: [{ ...def("demo", plugin), defaultEnabled: true }],
      storage: { stateStore: memoryStore(), loadPluginSettings: async () => ({}), savePluginSettings: async () => undefined },
    };
    let hostRef: CorePluginHost | null = null;
    function Harness() {
      const h = useCorePluginHost(config, { editor, getCurrentFile: () => null, openFile: () => true });
      hostRef = h.host;
      return createElement(CorePluginViewOverlay, { host: h.host, view: h.activeView, onClose: h.closeView });
    }
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => root.render(createElement(Harness)));
    await act(async () => void (await hostRef!.registry.setEnabled("demo", true)));

    await act(async () => void (await api.workspace.openView("demo-view", { path: "a.md" })));
    expect(el.querySelector('[data-core-view="demo-view"] p')?.textContent).toBe("view for a.md");
    await act(async () => api.workspace.closeView());
    expect(el.querySelector("[data-core-view]")).toBeNull();
    expect(cleanup).toHaveBeenCalledTimes(1);

    await act(async () => void (await api.workspace.openView("demo-view")));
    await act(async () => void window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(el.querySelector("[data-core-view]")).toBeNull();

    await act(async () => void (await api.workspace.openView("demo-view")));
    await act(async () => void (await hostRef!.registry.setEnabled("demo", false)));
    expect(el.querySelector("[data-core-view]")).toBeNull();
    expect(cleanup).toHaveBeenCalledTimes(3);
    await act(async () => root.unmount());
    el.remove();
  });
});

describe("plugin sidebar panels (CorePluginSidePanels)", () => {
  it("toggles a panel from the plugin, shows it on the right with its own DOM, and drops it when the plugin stops", async () => {
    let api!: PluginApi;
    const cleanup = vi.fn();
    const config: CorePluginHostConfig = {
      adapter: new MemoryVaultAdapter(),
      platform: "web",
      vaultPath: null,
      plugins: [
        {
          ...def("p", {
            onload(a) {
              api = a;
              a.ui.addSidebarPanel({
                id: "side",
                title: "Side",
                icon: "S",
                render(el) {
                  el.textContent = "panel body";
                  return cleanup;
                },
              });
            },
          }),
          defaultEnabled: true,
        },
      ],
      storage: { stateStore: memoryStore(), loadPluginSettings: async () => ({}), savePluginSettings: async () => undefined },
    };
    let hostRef: CorePluginHost | null = null;
    function Harness() {
      const h = useCorePluginHost(config, { editor, getCurrentFile: () => null, openFile: () => true });
      const { contributions } = useCorePlugins(h.host);
      hostRef = h.host;
      return createElement(CorePluginSidePanels, { panels: contributions.sidebarPanels, open: h.openPanels, onClose: h.togglePanel });
    }
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => root.render(createElement(Harness)));
    await act(async () => void (await hostRef!.registry.setEnabled("p", true)));
    expect(el.querySelector("[data-core-panel]")).toBeNull();

    await act(async () => api.ui.toggleSidebarPanel("side"));
    expect(el.querySelector('[data-core-panel="p:side"]')?.textContent).toContain("panel body");
    await act(async () => el.querySelector<HTMLButtonElement>(".core-panel-close")!.click());
    expect(el.querySelector("[data-core-panel]")).toBeNull();
    expect(cleanup).toHaveBeenCalledTimes(1);

    await act(async () => api.ui.toggleSidebarPanel("side"));
    await act(async () => void (await hostRef!.registry.setEnabled("p", false)));
    expect(el.querySelector("[data-core-panel]")).toBeNull();
    expect(cleanup).toHaveBeenCalledTimes(2);
    await act(async () => root.unmount());
    el.remove();
  });

  it("stores attachments through the adapter under a plain file name", async () => {
    const adapter = new MemoryVaultAdapter();
    let api!: PluginApi;
    const { host } = makeHost([def("a", { onload: (a) => void (api = a) })], { adapter });
    await host.registry.setEnabled("a", true);
    const target = await api.vault.saveAttachment("../evil/rec:1.webm", new Blob(["x"], { type: "audio/webm" }));
    // Separators and reserved characters become "_", leading dots go: the name can never leave attachments/.
    expect(target).toBe("attachments/_evil_rec_1.webm");
    expect(adapter.attachments.has(target)).toBe(true);
  });
});

describe("note toolbar buttons, history and read-only rendering", () => {
  it("collects note toolbar buttons, renders them and drops them when the plugin is turned off", async () => {
    const onClick = vi.fn();
    const plugin: CorePlugin = {
      onload: (api) => {
        api.ui.addNoteToolbarButton({ id: "present", title: "Present", icon: "P", onClick });
        api.ui.addNoteToolbarButton({ id: "tmp", title: "Tmp", icon: "T", onClick });
        api.ui.removeNoteToolbarButton("tmp");
      },
    };
    const { host } = makeHost([def("s", plugin)]);
    await host.registry.setEnabled("s", true);
    expect(host.getContributions().noteToolbarButtons.map((b) => b.key)).toEqual(["s:present"]);

    const el = document.createElement("div");
    const root = createRoot(el);
    await act(async () => root.render(createElement(CorePluginNoteToolbarButtons, { buttons: host.getContributions().noteToolbarButtons })));
    await act(async () => el.querySelector<HTMLButtonElement>('[data-core-note-button="s:present"]')!.click());
    expect(onClick).toHaveBeenCalledOnce();
    await act(async () => root.unmount());

    await host.registry.setEnabled("s", false);
    expect(host.getContributions().noteToolbarButtons).toEqual([]);
  });

  it("reads snapshots and commits of a note by path through the adapter", async () => {
    const adapter = new MemoryVaultAdapter({ "n.md": "now" });
    adapter.snapshots.set("n.md", [{ id: "s1", timestamp: 5, size: 3, content: "then" }]);
    let api!: PluginApi;
    const { host } = makeHost([def("h", { onload: (a) => void (api = a) })], { adapter });
    await host.registry.setEnabled("h", true);
    expect(await api.vault.versionSources()).toEqual({ snapshots: true, git: false });
    expect(await api.vault.snapshots("n.md")).toEqual([{ id: "s1", timestamp: 5, size: 3 }]);
    expect(await api.vault.readSnapshot("n.md", "s1")).toBe("then");
    expect(await api.vault.snapshots("missing.md")).toEqual([]);

    adapter.commits.set("n.md", [{ hash: "abc", author: "a", date: "2026-10-16", message: "m", content: "old" }]);
    expect((await api.vault.versionSources()).git).toBe(true);
    expect(await api.vault.gitLog("n.md")).toEqual([{ hash: "abc", author: "a", date: "2026-10-16", message: "m" }]);
    expect(await api.vault.readAtCommit("n.md", "abc")).toBe("old");
  });

  it("without history methods in the adapter there is simply no history", async () => {
    const adapter = new MemoryVaultAdapter({ "n.md": "now" });
    const bare = Object.assign(Object.create(Object.getPrototypeOf(adapter)), adapter, {
      historySources: undefined,
      noteSnapshots: undefined,
      noteGitLog: undefined,
    });
    let api!: PluginApi;
    const { host } = makeHost([def("h", { onload: (a) => void (api = a) })], { adapter: bare });
    await host.registry.setEnabled("h", true);
    expect(await api.vault.versionSources()).toEqual({ snapshots: false, git: false });
    expect(await api.vault.snapshots("n.md")).toEqual([]);
    expect(await api.vault.gitLog("n.md")).toEqual([]);
  });

  it("renders markdown read-only as plain text when the app gives no renderer", async () => {
    let api!: PluginApi;
    const { host } = makeHost([def("r", { onload: (a) => void (api = a) })]);
    await host.registry.setEnabled("r", true);
    const el = document.createElement("div");
    const cleanup = api.markdown.renderReadOnly("# Title", el);
    expect(el.textContent).toBe("# Title");
    cleanup();
    expect(el.textContent).toBe("");
  });
});

describe("plugin hotkeys", () => {
  const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });

  it("matches Mod per platform and uses the physical key", () => {
    expect(matchesHotkey(key({ ctrlKey: true, altKey: true, code: "KeyW", key: "w" }), "Mod+Alt+W", false)).toBe(true);
    expect(matchesHotkey(key({ metaKey: true, altKey: true, code: "KeyW", key: "∑" }), "Mod+Alt+W", true)).toBe(true);
    expect(matchesHotkey(key({ ctrlKey: true, code: "KeyW", key: "w" }), "Mod+Alt+W", false)).toBe(false);
    expect(matchesHotkey(key({ ctrlKey: true, shiftKey: true, altKey: true, code: "KeyW", key: "W" }), "Mod+Alt+W", false)).toBe(false);
  });

  it("runs a command unless the app already handled the key", async () => {
    const run = vi.fn();
    const commands = [{ pluginId: "p", key: "p:c", id: "c", name: "C", hotkey: "Ctrl+Alt+W", run }];
    function Harness() {
      useCorePluginHotkeys(commands);
      return null;
    }
    const el = document.createElement("div");
    const root = createRoot(el);
    await act(async () => root.render(createElement(Harness)));
    window.dispatchEvent(key({ ctrlKey: true, altKey: true, code: "KeyW", key: "w" }));
    await new Promise((r) => setTimeout(r, 5));
    expect(run).toHaveBeenCalledOnce();
    const handled = key({ ctrlKey: true, altKey: true, code: "KeyW", key: "w" });
    handled.preventDefault();
    window.dispatchEvent(handled);
    await new Promise((r) => setTimeout(r, 5));
    expect(run).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
  });

  it("takes the key from the browser (Ctrl+D bookmark) when it runs, after the app's own listeners", () => {
    const run = vi.fn();
    const commands = [{ pluginId: "p", key: "p:d", id: "d", name: "Today", hotkey: "Ctrl+D", run }];
    function Harness() {
      useCorePluginHotkeys(commands);
      return null;
    }
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    act(() => root.render(createElement(Harness)));
    // An app listener on window added after the plugin hook: it must still run first.
    const order: string[] = [];
    const appListener = () => order.push("app");
    window.addEventListener("keydown", appListener);
    run.mockImplementation(() => order.push("plugin"));
    const ev = key({ ctrlKey: true, code: "KeyD", key: "d" });
    el.dispatchEvent(ev);
    expect(order).toEqual(["app", "plugin"]);
    expect(ev.defaultPrevented).toBe(true);
    window.removeEventListener("keydown", appListener);
    act(() => root.unmount());
    el.remove();
  });

  it("wins over the editor's own keymap (CodeMirror skips prevented keys) but not over an app listener that claims it", () => {
    const run = vi.fn();
    const commands = [{ pluginId: "p", key: "p:g", id: "g", name: "Graph", hotkey: "Ctrl+G", run }];
    function Harness() {
      useCorePluginHotkeys(commands);
      return null;
    }
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(createElement(Harness)));
    // Stand-in for CodeMirror's content element: handles Mod-g (find next) unless the event is already prevented.
    const editorEl = document.createElement("div");
    document.body.appendChild(editorEl);
    const editorFindNext = vi.fn();
    editorEl.addEventListener("keydown", (e) => {
      if (e.defaultPrevented) return;
      editorFindNext();
      e.preventDefault();
    });
    editorEl.dispatchEvent(key({ ctrlKey: true, code: "KeyG", key: "g" }));
    expect(editorFindNext).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledOnce();

    const claim = (e: KeyboardEvent) => e.preventDefault();
    window.addEventListener("keydown", claim);
    editorEl.dispatchEvent(key({ ctrlKey: true, code: "KeyG", key: "g" }));
    expect(run).toHaveBeenCalledOnce();
    window.removeEventListener("keydown", claim);

    act(() => root.unmount());
    host.remove();
    editorEl.remove();
  });
});
