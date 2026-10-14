"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  HotkeyBinding,
  HotkeyAction,
  DEFAULT_HOTKEYS,
  eventToKeyString,
  formatHotkey,
} from "@/lib/hotkeys";
import { EDITOR_FONTS, AUTO_SAVE_OPTIONS, ACCENT_COLORS, TAB_SIZES } from "@/lib/settings";
import ThemePicker from "@/components/ThemePicker";
import SyncSection from "@/components/sync/SyncSection";
import PluginMirror from "@/components/PluginMirror";
import ClipperSection from "@/components/ClipperSection";
import type { PluginPanelRef } from "@/lib/plugin-sandbox/types";
import type { MirrorEvent } from "@/lib/plugin-sandbox/mirror";

type BuiltInSection = "general" | "appearance" | "editor" | "shortcuts" | "sync" | "ecosystem" | "clipper";
/** Plugin settings tabs are addressed as `plugin:<pluginDbId>:<tabId>`. */
type Section = BuiltInSection | `plugin:${string}`;

const SECTIONS: { id: BuiltInSection; label: string }[] = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Appearance" },
  { id: "editor", label: "Editor" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "sync", label: "Sync" },
  { id: "ecosystem", label: "Ecosystem" },
  { id: "clipper", label: "Clipper" },
];

export interface EditorSettings {
  editorFont: string;
  fontSize: number;
  lineHeight: number;
  autoSaveInterval: number;
  vimModeEnabled: boolean;
  spellCheck: boolean;
  accentColor: string;
  tabSize: number;
  pdfColumnLayout: 1 | 2;
  pdfChessboardWidth: 75 | 100;
  autoCollapseSidebar: boolean;
}

interface SettingsModalProps {
  vaultId: string;
  vaultName?: string;
  currentThemeId: string;
  onThemeSelect: (themeId: string) => void;
  hotkeys: HotkeyBinding[];
  onHotkeysChange: (hotkeys: HotkeyBinding[]) => void;
  editorSettings: EditorSettings;
  onEditorSettingsChange: (patch: Partial<EditorSettings>) => void;
  platform: string;
  onOpenPlugins: () => void;
  onOpenSnippets: () => void;
  onClose: () => void;
  initialSection?: BuiltInSection;
  /** Settings tabs registered by plugins (ui.addSettingsTab). */
  pluginTabs?: PluginPanelRef[];
  onPluginEvent?: (tab: PluginPanelRef, e: MirrorEvent) => void;
}

export default function SettingsModal({
  vaultId,
  vaultName,
  currentThemeId,
  onThemeSelect,
  hotkeys,
  onHotkeysChange,
  editorSettings,
  onEditorSettingsChange,
  platform,
  onOpenPlugins,
  onOpenSnippets,
  onClose,
  initialSection,
  pluginTabs = [],
  onPluginEvent,
}: SettingsModalProps) {
  const [active, setActive] = useState<Section>(initialSection ?? "general");
  const [recording, setRecording] = useState<HotkeyAction | null>(null);
  const [shortcutQuery, setShortcutQuery] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (recording) {
        e.preventDefault();
        e.stopPropagation();
        const combo = eventToKeyString(e);
        if (!combo) return;
        const conflict = hotkeys.find((h) => h.keys === combo && h.action !== recording);
        onHotkeysChange(
          hotkeys.map((h) => {
            if (h.action === recording) return { ...h, keys: combo };
            if (conflict && h.action === conflict.action) {
              const def = DEFAULT_HOTKEYS.find((d) => d.action === h.action);
              return { ...h, keys: def?.keys ?? "" };
            }
            return h;
          })
        );
        setRecording(null);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [recording, hotkeys, onHotkeysChange, onClose]);

  const resetAllHotkeys = () => onHotkeysChange(DEFAULT_HOTKEYS.map((d) => ({ ...d })));
  const resetHotkey = (action: HotkeyAction) => {
    const def = DEFAULT_HOTKEYS.find((d) => d.action === action);
    if (!def) return;
    onHotkeysChange(hotkeys.map((h) => (h.action === action ? { ...h, keys: def.keys } : h)));
  };

  const categories = Array.from(new Set(hotkeys.map((h) => h.category)));
  const normalizedShortcutQuery = shortcutQuery.trim().toLowerCase();
  const filteredHotkeys = normalizedShortcutQuery
    ? hotkeys.filter((h) =>
        [h.label, h.action, h.category, h.keys, formatHotkey(h.keys, platform)].some((v) =>
          v.toLowerCase().includes(normalizedShortcutQuery)
        )
      )
    : hotkeys;

  const renderGeneral = () => (
    <div className="st-section">
      <Row label="Tự thu gọn sidebar" desc="Thu gọn sidebar khi cửa sổ hẹp hơn 800px.">
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={editorSettings.autoCollapseSidebar} onChange={(e) => onEditorSettingsChange({ autoCollapseSidebar: e.target.checked })} />
          <span className="st-hint">{editorSettings.autoCollapseSidebar ? "Bật" : "Tắt"}</span>
        </label>
      </Row>
      <Row label="PDF: số cột" desc="Bố cục khi xuất PDF.">
        <select className="st-select" value={editorSettings.pdfColumnLayout} onChange={(e) => onEditorSettingsChange({ pdfColumnLayout: Number(e.target.value) as 1 | 2 })}>
          <option value={1}>1 cột</option>
          <option value={2}>2 cột</option>
        </select>
      </Row>
      <Row label="PDF: cỡ bàn cờ" desc="Chiều rộng bàn cờ so với cột.">
        <select className="st-select" value={editorSettings.pdfChessboardWidth} onChange={(e) => onEditorSettingsChange({ pdfChessboardWidth: Number(e.target.value) as 75 | 100 })}>
          <option value={75}>75%</option>
          <option value={100}>100%</option>
        </select>
      </Row>
      <Row label="Auto-save" desc="Tự động lưu sau khi dừng gõ bao lâu.">
        <select
          className="st-select"
          value={editorSettings.autoSaveInterval}
          onChange={(e) => onEditorSettingsChange({ autoSaveInterval: Number(e.target.value) })}
        >
          {AUTO_SAVE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Row>
      <div className="st-divider" />
      <div className="st-row-desc" style={{ padding: "8px 0" }}>
        Xuất dữ liệu / xoá tài khoản nằm ở trang danh sách vault (menu &quot;Tài khoản&quot;).
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="st-section">
      <Row label="Màu nhấn (accent)" desc="Ghi đè màu nhấn của theme; chọn ô đầu để dùng màu của theme.">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.name}
              title={c.name}
              onClick={() => onEditorSettingsChange({ accentColor: c.value })}
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: c.value || "transparent",
                border: editorSettings.accentColor === c.value ? "2px solid var(--text-primary)" : "1px solid var(--border)",
                fontSize: 10,
              }}
            >
              {c.value ? "" : "∅"}
            </button>
          ))}
        </div>
      </Row>
      <ThemePicker currentThemeId={currentThemeId} vaultId={vaultId} onThemeSelect={onThemeSelect} />
    </div>
  );

  const renderEditor = () => (
    <div className="st-section">
      <Row label="Font size" desc="Cỡ chữ cơ bản trong editor (px).">
        <Stepper value={editorSettings.fontSize} min={11} max={24} onChange={(v) => onEditorSettingsChange({ fontSize: v })} />
      </Row>
      <Row label="Line height" desc="Khoảng cách giữa các dòng.">
        <Stepper
          value={editorSettings.lineHeight}
          min={1.2}
          max={2.5}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => onEditorSettingsChange({ lineHeight: v })}
        />
      </Row>
      <Row label="Editor font" desc="Font monospace dùng trong editor.">
        <select
          className="st-select"
          value={editorSettings.editorFont}
          onChange={(e) => onEditorSettingsChange({ editorFont: e.target.value })}
        >
          {EDITOR_FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.name}
            </option>
          ))}
        </select>
      </Row>
      <div className="st-divider" />
      <Row label="Tab size" desc="Số khoảng trắng của một lần thụt lề (phím Tab).">
        <select className="st-select" value={editorSettings.tabSize} onChange={(e) => onEditorSettingsChange({ tabSize: Number(e.target.value) })}>
          {TAB_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Row>
      <Row label="Kiểm tra chính tả" desc="Gạch chân từ sai theo trình duyệt (ngôn ngữ do trình duyệt quyết định).">
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={editorSettings.spellCheck} onChange={(e) => onEditorSettingsChange({ spellCheck: e.target.checked })} />
          <span className="st-hint">{editorSettings.spellCheck ? "Bật" : "Tắt"}</span>
        </label>
      </Row>
      <Row label="Vim mode" desc="Dùng phím tắt kiểu Vim trong editor (chế độ Edit).">
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={editorSettings.vimModeEnabled}
            onChange={(e) => onEditorSettingsChange({ vimModeEnabled: e.target.checked })}
          />
          <span className="st-hint">{editorSettings.vimModeEnabled ? "Bật" : "Tắt"}</span>
        </label>
      </Row>
    </div>
  );

  const renderShortcuts = () => (
    <div className="st-section">
      <div className="st-shortcuts-header">
        <span className="st-hint">Bấm vào một phím tắt để gán lại</span>
        <button onClick={resetAllHotkeys} className="st-reset-all">
          Đặt lại tất cả
        </button>
      </div>
      <div className="st-shortcut-search">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={shortcutQuery}
          onChange={(e) => setShortcutQuery(e.target.value)}
          placeholder="Tìm lệnh hoặc phím"
          aria-label="Tìm phím tắt"
        />
      </div>
      {categories.map(
        (cat) =>
          filteredHotkeys.some((h) => h.category === cat) && (
            <div key={cat} className="st-shortcut-group">
              <div className="st-shortcut-cat">{cat}</div>
              {filteredHotkeys
                .filter((h) => h.category === cat)
                .map((h) => {
                  const isRec = recording === h.action;
                  const isDefault = DEFAULT_HOTKEYS.find((d) => d.action === h.action)?.keys === h.keys;
                  return (
                    <div key={h.action} className="st-shortcut-row">
                      <span className="st-shortcut-label">{h.label}</span>
                      <div className="st-shortcut-keys">
                        <button
                          onClick={() => setRecording(isRec ? null : h.action)}
                          className={`settings-key-btn${isRec ? " recording" : ""}`}
                        >
                          {isRec ? "Nhấn phím..." : formatHotkey(h.keys, platform) || "—"}
                        </button>
                        {!isDefault && (
                          <button onClick={() => resetHotkey(h.action)} className="settings-key-reset" title="Đặt lại mặc định">
                            <svg width="12" height="12" viewBox="0 0 12 12">
                              <path
                                d="M2 4h3L2 1M2 4a5 5 0 105 5"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )
      )}
      {normalizedShortcutQuery && filteredHotkeys.length === 0 && (
        <div className="st-shortcut-empty">Không có phím tắt nào khớp &quot;{shortcutQuery}&quot;.</div>
      )}
    </div>
  );

  const renderEcosystem = () => (
    <div className="st-section">
      <div className="st-ecosystem-card" onClick={() => { onClose(); onOpenPlugins(); }}>
        <div className="st-ecosystem-icon">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5L2 4.5v4l6 3 6-3v-4L8 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M2 4.5L8 7.5l6-3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M8 7.5v4.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </div>
        <div className="st-ecosystem-info">
          <span className="st-ecosystem-title">Plugin cộng đồng</span>
          <span className="st-ecosystem-desc">Mở rộng Noteriv bằng plugin — cài, bật/tắt, gỡ.</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="st-ecosystem-arrow">
          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="st-ecosystem-card" onClick={() => { onClose(); onOpenSnippets(); }}>
        <div className="st-ecosystem-icon">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M4 4h8v8H4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M6 7h4M6 9h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="st-ecosystem-info">
          <span className="st-ecosystem-title">CSS Snippets</span>
          <span className="st-ecosystem-desc">Tuỳ biến giao diện bằng CSS snippet riêng.</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="st-ecosystem-arrow">
          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="st-ecosystem-card" onClick={() => setActive("appearance")}>
        <div className="st-ecosystem-icon">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
            <path d="M2 8h12M8 2a10 10 0 013 6 10 10 0 01-3 6 10 10 0 01-3-6 10 10 0 013-6z" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </div>
        <div className="st-ecosystem-info">
          <span className="st-ecosystem-title">Theme cộng đồng</span>
          <span className="st-ecosystem-desc">Xem trong tab Appearance &gt; Theme.</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="st-ecosystem-arrow">
          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );

  const builtInContent: Record<BuiltInSection, () => React.JSX.Element> = {
    general: renderGeneral,
    appearance: renderAppearance,
    editor: renderEditor,
    shortcuts: renderShortcuts,
    sync: () => <SyncSection vaultId={vaultId} />,
    ecosystem: renderEcosystem,
    clipper: () => <ClipperSection vaultId={vaultId} vaultName={vaultName ?? "vault này"} />,
  };

  const navItems: { id: Section; label: string }[] = [
    ...SECTIONS,
    ...pluginTabs.map((t) => ({ id: `plugin:${t.pluginDbId}:${t.id}` as Section, label: t.title })),
  ];
  const activePluginTab = active.startsWith("plugin:")
    ? pluginTabs.find((t) => `plugin:${t.pluginDbId}:${t.id}` === active)
    : undefined;

  function renderActive() {
    if (active.startsWith("plugin:")) {
      // A plugin tab can disappear while open (plugin disabled): fall back to a notice, not a crash.
      return activePluginTab ? (
        <PluginMirror html={activePluginTab.html} css={activePluginTab.css} onEvent={(e) => onPluginEvent?.(activePluginTab, e)} />
      ) : (
        <div className="st-row-desc">Tab này không còn khả dụng (plugin đã tắt?).</div>
      );
    }
    return builtInContent[active as BuiltInSection]();
  }

  return (
    <div ref={overlayRef} className="settings-overlay" onClick={handleBackdrop}>
      <div className="settings-modal">
        <div className="st-nav">
          <div className="st-nav-title">Settings</div>
          {navItems.map((s) => (
            <button key={s.id} className={`st-nav-item${active === s.id ? " st-nav-active" : ""}`} onClick={() => setActive(s.id)}>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
        <div className="st-main">
          <div className="st-header">
            <h2 className="st-title">{navItems.find((s) => s.id === active)?.label}</h2>
            <button onClick={onClose} className="settings-close-btn">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="st-content">{renderActive()}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="st-row">
      <div className="st-row-info">
        <span className="st-row-label">{label}</span>
        {desc && <span className="st-row-desc">{desc}</span>}
      </div>
      <div className="st-row-control">{children}</div>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(4)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(4)));
  return (
    <div className="st-stepper">
      <button onClick={dec} disabled={value <= min}>
        -
      </button>
      <span>{format ? format(value) : value}</span>
      <button onClick={inc} disabled={value >= max}>
        +
      </button>
    </div>
  );
}
