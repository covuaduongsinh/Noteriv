"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  HotkeyBinding,
  HotkeyAction,
  DEFAULT_HOTKEYS,
  eventToKeyString,
  formatHotkey,
} from "@/lib/hotkeys";
import { EDITOR_FONTS, AUTO_SAVE_OPTIONS } from "@/lib/settings";
import ThemePicker from "@/components/ThemePicker";
import { webApi, type ApiSyncConnection, type ApiSyncJob, type SyncProviderType } from "@/lib/webApi";

type Section = "general" | "appearance" | "editor" | "shortcuts" | "sync" | "ecosystem";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Appearance" },
  { id: "editor", label: "Editor" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "sync", label: "Sync" },
  { id: "ecosystem", label: "Ecosystem" },
];

export interface EditorSettings {
  editorFont: string;
  fontSize: number;
  lineHeight: number;
  autoSaveInterval: number;
  vimModeEnabled: boolean;
}

interface SettingsModalProps {
  vaultId: string;
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
  initialSection?: Section;
}

/** Extract the hostname from an https or SSH git remote URL. */
function gitRemoteHost(url: string): string {
  const u = (url || "").trim();
  if (!u) return "";
  const ssh = u.match(/^(?:ssh:\/\/)?[^@/]+@([^:/]+)/);
  if (ssh) return ssh[1].toLowerCase();
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function providerForHost(host: string): Exclude<SyncProviderType, "webdav"> {
  if (host === "github.com" || host.endsWith(".github.com")) return "github";
  if (host.includes("gitlab")) return "gitlab";
  if (host.includes("forgejo")) return "forgejo";
  return "gitea"; // gitea/forgejo/codeberg/self-hosted all speak the same REST shape server-side
}

function tokenPageUrl(host: string): string | null {
  if (host === "github.com" || host.endsWith(".github.com")) {
    return "https://github.com/settings/tokens/new?scopes=repo&description=Noteriv";
  }
  if (host.includes("gitlab")) return `https://${host}/-/user_settings/personal_access_tokens`;
  if (host.includes("gitea") || host.includes("forgejo") || host === "codeberg.org") {
    return `https://${host}/user/settings/applications`;
  }
  if (host.includes("bitbucket")) return "https://bitbucket.org/account/settings/app-passwords/";
  return null;
}

export default function SettingsModal({
  vaultId,
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

  const sectionContent: Record<Section, () => React.JSX.Element> = {
    general: renderGeneral,
    appearance: renderAppearance,
    editor: renderEditor,
    shortcuts: renderShortcuts,
    sync: () => <SyncSection vaultId={vaultId} />,
    ecosystem: renderEcosystem,
  };

  return (
    <div ref={overlayRef} className="settings-overlay" onClick={handleBackdrop}>
      <div className="settings-modal">
        <div className="st-nav">
          <div className="st-nav-title">Settings</div>
          {SECTIONS.map((s) => (
            <button key={s.id} className={`st-nav-item${active === s.id ? " st-nav-active" : ""}`} onClick={() => setActive(s.id)}>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
        <div className="st-main">
          <div className="st-header">
            <h2 className="st-title">{SECTIONS.find((s) => s.id === active)?.label}</h2>
            <button onClick={onClose} className="settings-close-btn">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="st-content">{sectionContent[active]()}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sync tab — the client UI for the sync backend that's existed since Phase 4
 * (web/server/src/routes/syncConnections.ts, lib/gitSync.ts, lib/webdavSync.ts)
 * but had zero caller until now (docs/plans/2026-10-13-noteriv-web-full-parity.md
 * Phase B1). Deliberately does NOT port desktop's "Folder sync" provider (no
 * server-side equivalent, dropped in the original plan) or its 5s auto-sync
 * polling default — connections default to manual trigger here, matching
 * `autoSync: false` on SyncConnection.
 */
function SyncSection({ vaultId }: { vaultId: string }) {
  const [connections, setConnections] = useState<ApiSyncConnection[] | null>(null);
  const [showAddForm, setShowAddForm] = useState<"git" | "webdav" | null>(null);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [webdavUrl, setWebdavUrl] = useState("");
  const [webdavPath, setWebdavPath] = useState("/Noteriv");
  const [webdavUser, setWebdavUser] = useState("");
  const [webdavPass, setWebdavPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [statusByConn, setStatusByConn] = useState<Record<string, { latestJob: ApiSyncJob | null }>>({});
  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const refresh = useCallback(() => {
    webApi.sync.list(vaultId).then(setConnections).catch(() => setConnections([]));
  }, [vaultId]);

  useEffect(() => {
    refresh();
    return () => {
      Object.values(pollTimers.current).forEach(clearInterval);
    };
  }, [refresh]);

  function pollStatus(connId: string) {
    if (pollTimers.current[connId]) clearInterval(pollTimers.current[connId]);
    pollTimers.current[connId] = setInterval(async () => {
      const res = await webApi.sync.status(vaultId, connId);
      setStatusByConn((prev) => ({ ...prev, [connId]: { latestJob: res.latestJob } }));
      if (res.latestJob && res.latestJob.status !== "queued" && res.latestJob.status !== "running") {
        clearInterval(pollTimers.current[connId]);
        delete pollTimers.current[connId];
        refresh();
      }
    }, 2000);
  }

  async function triggerSync(connId: string) {
    await webApi.sync.trigger(vaultId, connId);
    pollStatus(connId);
  }

  async function removeConnection(connId: string) {
    if (pollTimers.current[connId]) clearInterval(pollTimers.current[connId]);
    await webApi.sync.remove(vaultId, connId);
    refresh();
  }

  async function submitGit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!remoteUrl.trim() || !token.trim()) {
      setFormError("Cần remote URL và access token.");
      return;
    }
    setSaving(true);
    try {
      const host = gitRemoteHost(remoteUrl);
      await webApi.sync.createGit(vaultId, {
        providerType: providerForHost(host),
        remoteUrl: remoteUrl.trim(),
        branch: branch.trim() || "main",
        direction: "both",
        username: username.trim(),
        token: token.trim(),
      });
      setRemoteUrl("");
      setToken("");
      setUsername("");
      setShowAddForm(null);
      refresh();
    } catch {
      setFormError("Không thêm được kết nối — kiểm tra lại remote URL/token.");
    } finally {
      setSaving(false);
    }
  }

  async function submitWebdav(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!webdavUrl.trim() || !webdavUser.trim() || !webdavPass.trim()) {
      setFormError("Cần URL, username và password.");
      return;
    }
    setSaving(true);
    try {
      await webApi.sync.createWebdav(vaultId, {
        providerType: "webdav",
        webdavUrl: webdavUrl.trim(),
        webdavPath: webdavPath.trim() || "/",
        direction: "both",
        username: webdavUser.trim(),
        password: webdavPass,
      });
      setWebdavUrl("");
      setWebdavUser("");
      setWebdavPass("");
      setShowAddForm(null);
      refresh();
    } catch {
      setFormError("Không thêm được kết nối WebDAV — kiểm tra lại thông tin.");
    } finally {
      setSaving(false);
    }
  }

  const host = gitRemoteHost(remoteUrl);
  const ptu = tokenPageUrl(host);

  return (
    <div className="st-section">
      <div className="st-group-label">Kết nối Sync</div>
      {connections === null && <div className="st-row-desc">Đang tải…</div>}
      {connections?.length === 0 && !showAddForm && (
        <div className="st-row-desc" style={{ padding: "8px 0" }}>
          Chưa có kết nối sync nào.
        </div>
      )}
      {connections?.map((c) => {
        const job = statusByConn[c.id]?.latestJob;
        const isRunning = job?.status === "queued" || job?.status === "running";
        return (
          <div key={c.id} className="st-row">
            <div className="st-row-info">
              <span className="st-row-label">
                {c.providerType === "webdav" ? c.webdavUrl : `${c.providerType} · ${c.remoteUrl}`}
              </span>
              <span className="st-row-desc">
                {c.lastSyncedAt ? `Lần cuối: ${new Date(c.lastSyncedAt).toLocaleString()}` : "Chưa sync lần nào"}
                {isRunning && " · đang sync…"}
                {job && job.status === "error" && job.errorMessage && ` · lỗi: ${job.errorMessage}`}
              </span>
            </div>
            <div className="st-row-control" style={{ display: "flex", gap: 6 }}>
              <button className="st-test-btn" onClick={() => triggerSync(c.id)} disabled={isRunning}>
                {isRunning ? "Đang sync…" : "Sync ngay"}
              </button>
              <button className="st-test-btn" onClick={() => removeConnection(c.id)}>
                Xoá
              </button>
            </div>
          </div>
        );
      })}

      <div className="st-divider" />

      {!showAddForm ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="st-test-btn" onClick={() => setShowAddForm("git")}>
            + Thêm Git remote
          </button>
          <button className="st-test-btn" onClick={() => setShowAddForm("webdav")}>
            + Thêm WebDAV
          </button>
        </div>
      ) : showAddForm === "git" ? (
        <form onSubmit={submitGit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Row label="Remote URL" desc="GitHub, GitLab, Gitea/Forgejo — HTTPS.">
            <input
              className="st-text-input"
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              style={{ minWidth: 260 }}
            />
          </Row>
          <Row label="Branch" desc="">
            <input className="st-text-input" value={branch} onChange={(e) => setBranch(e.target.value)} />
          </Row>
          {ptu && (
            <a href={ptu} target="_blank" rel="noopener noreferrer" className="st-test-btn" style={{ alignSelf: "flex-start" }}>
              Tạo access token →
            </a>
          )}
          <Row label="Username" desc="Bỏ trống nếu không cần (GitLab). Dùng login cho Gitea/Forgejo.">
            <input className="st-text-input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </Row>
          <Row label="Access token" desc="">
            <input
              type="password"
              className="st-text-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxx..."
            />
          </Row>
          {formError && <div className="st-test-result st-test-fail">{formError}</div>}
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" className="st-test-btn" disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu"}
            </button>
            <button type="button" className="st-test-btn" onClick={() => setShowAddForm(null)}>
              Huỷ
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={submitWebdav} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Row label="Server URL" desc="Nextcloud, ownCloud, hoặc WebDAV bất kỳ.">
            <input
              className="st-text-input"
              value={webdavUrl}
              onChange={(e) => setWebdavUrl(e.target.value)}
              placeholder="https://cloud.example.com/remote.php/dav"
              style={{ minWidth: 260 }}
            />
          </Row>
          <Row label="Username" desc="">
            <input className="st-text-input" value={webdavUser} onChange={(e) => setWebdavUser(e.target.value)} />
          </Row>
          <Row label="Password" desc="">
            <input type="password" className="st-text-input" value={webdavPass} onChange={(e) => setWebdavPass(e.target.value)} />
          </Row>
          <Row label="Remote path" desc="">
            <input className="st-text-input" value={webdavPath} onChange={(e) => setWebdavPath(e.target.value)} />
          </Row>
          {formError && <div className="st-test-result st-test-fail">{formError}</div>}
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" className="st-test-btn" disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu"}
            </button>
            <button type="button" className="st-test-btn" onClick={() => setShowAddForm(null)}>
              Huỷ
            </button>
          </div>
        </form>
      )}
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
