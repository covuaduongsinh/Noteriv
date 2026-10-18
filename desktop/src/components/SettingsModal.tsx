"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  HotkeyBinding,
  HotkeyAction,
  DEFAULT_HOTKEYS,
  eventToKeyString,
  formatHotkey,
} from "@/lib/hotkeys";
import {
  AppSettings,
  DEFAULT_SETTINGS,
  ACCENT_COLORS,
  EDITOR_FONTS,
  AUTO_SAVE_OPTIONS,
  SYNC_OPTIONS,
  PDF_COLUMN_LAYOUT_OPTIONS,
} from "@/lib/settings";
import {
  SYNC_PROVIDERS,
  FOLDER_DIRECTIONS,
  type SyncProviderType,
} from "@/lib/sync-providers";
import ThemePicker from "@/components/ThemePicker";
import { CorePluginsSection, type HostPanel } from "@noteriv/ui/plugins";
import type { CorePluginInfo } from "@noteriv/core/plugin-registry";
import { t, tOr } from "@noteriv/ui/i18n";
import { useLocale } from "@noteriv/ui/i18n/react";
import { applyLanguage, AUTO_LANGUAGE } from "@/lib/i18n";

type Section = "general" | "appearance" | "editor" | "shortcuts" | "sync" | "corePlugins" | "ecosystem";

/** Sections in nav order; their names are `settings.sections.<id>` in the i18n catalog. */
const SECTIONS: Section[] = ["general", "appearance", "editor", "shortcuts", "sync", "corePlugins", "ecosystem"];

/** Extract the hostname from an https or SSH git remote URL. */
function gitRemoteHost(url: string): string {
  const u = (url || "").trim();
  if (!u) return "";
  // SSH forms: git@host:path  or  ssh://git@host/path
  const ssh = u.match(/^(?:ssh:\/\/)?[^@/]+@([^:/]+)/);
  if (ssh) return ssh[1].toLowerCase();
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return "";
  }
}

interface GitHostInfo {
  /** github.com — the only host we can validate a token against via its API. */
  isGitHub: boolean;
  /** PAT-creation page for known hosts (self-hosted included), else null. */
  tokenPageUrl: string | null;
}

function gitHostInfo(url: string): GitHostInfo {
  const host = gitRemoteHost(url);
  const isGitHub = host === "github.com" || host.endsWith(".github.com");
  let tokenPageUrl: string | null = null;
  if (isGitHub) {
    tokenPageUrl = "https://github.com/settings/tokens/new?scopes=repo&description=Noteriv";
  } else if (host.includes("gitlab")) {
    tokenPageUrl = `https://${host}/-/user_settings/personal_access_tokens`;
  } else if (host.includes("gitea") || host.includes("forgejo") || host === "codeberg.org") {
    tokenPageUrl = `https://${host}/user/settings/applications`;
  } else if (host.includes("bitbucket")) {
    tokenPageUrl = "https://bitbucket.org/account/settings/app-passwords/";
  }
  return { isGitHub, tokenPageUrl };
}

interface SettingsModalProps {
  settings: AppSettings;
  hotkeys: HotkeyBinding[];
  platform: string;
  vaultPath: string;
  vault: Vault | null;
  onSettingsChange: (settings: AppSettings) => void;
  onHotkeysChange: (hotkeys: HotkeyBinding[]) => void;
  onVaultUpdate: (vault: Vault) => void;
  onOpenPlugins: () => void;
  onOpenSnippets: () => void;
  /** Built-in plugins (Plugin API v1 core tier) and their on/off switch. */
  corePlugins?: CorePluginInfo[];
  onToggleCorePlugin?: (id: string, enabled: boolean) => void;
  /** Settings tabs registered by core plugins (shown under each plugin in "Core plugins"). */
  corePluginSettingsTabs?: HostPanel[];
  onClose: () => void;
}

export default function SettingsModal({
  settings,
  hotkeys,
  platform,
  vaultPath,
  vault,
  onSettingsChange,
  onHotkeysChange,
  onVaultUpdate,
  onOpenPlugins,
  onOpenSnippets,
  corePlugins = [],
  onToggleCorePlugin,
  corePluginSettingsTabs = [],
  onClose,
}: SettingsModalProps) {
  useLocale();
  const [active, setActive] = useState<Section>("general");
  const [recording, setRecording] = useState<HotkeyAction | null>(null);
  const [shortcutQuery, setShortcutQuery] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<AppSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };

  // Backdrop click
  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  // Keyboard handling
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (recording) {
        e.preventDefault();
        e.stopPropagation();
        const combo = eventToKeyString(e);
        if (!combo) return;

        const conflict = hotkeys.find(
          (h) => h.keys === combo && h.action !== recording
        );
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

  // Hotkey helpers
  const resetAllHotkeys = () =>
    onHotkeysChange(DEFAULT_HOTKEYS.map((d) => ({ ...d })));

  const resetHotkey = (action: HotkeyAction) => {
    const def = DEFAULT_HOTKEYS.find((d) => d.action === action);
    if (!def) return;
    onHotkeysChange(
      hotkeys.map((h) => (h.action === action ? { ...h, keys: def.keys } : h))
    );
  };

  // `category` stays the table's English name (it groups rows); what is shown and searched is the catalog's text.
  const categories = Array.from(new Set(hotkeys.map((h) => h.category)));
  const normalizedShortcutQuery = shortcutQuery.trim().toLowerCase();
  const filteredHotkeys = normalizedShortcutQuery
    ? hotkeys.filter((h) =>
        [hotkeyLabel(h), h.action, categoryLabel(h.category), h.keys, formatHotkey(h.keys, platform)]
          .some((value) => value.toLowerCase().includes(normalizedShortcutQuery))
      )
    : hotkeys;

  // Render sections
  const renderGeneral = () => (
    <div className="st-section">
      <Row label={t("settings.language.label")} desc={t("settings.language.desc")}>
        <select
          className="st-select"
          aria-label={t("settings.language.label")}
          value={settings.language ?? AUTO_LANGUAGE}
          onChange={(e) => {
            const value = e.target.value === "en" || e.target.value === "vi" ? e.target.value : AUTO_LANGUAGE;
            update({ language: value });
            void applyLanguage(value);
          }}
        >
          <option value={AUTO_LANGUAGE}>{t("settings.language.autoDesktop")}</option>
          {/* Each language is named in itself, so it can be found whatever the current language is. */}
          <option value="en">English</option>
          <option value="vi">Tiếng Việt</option>
        </select>
      </Row>
      <Row label={t("settings.autoSave.label")} desc={t("settings.autoSave.descDesktop")}>
        <select
          className="st-select"
          value={settings.autoSaveInterval}
          onChange={(e) => update({ autoSaveInterval: Number(e.target.value) })}
        >
          {AUTO_SAVE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label()}</option>
          ))}
        </select>
      </Row>
      <Row label={t("settings.spellCheck.label")} desc={t("settings.spellCheck.desc")}>
        <Toggle checked={settings.spellCheck} onChange={(v) => update({ spellCheck: v })} />
      </Row>
      <Row label={t("settings.autoCollapse.label")} desc={t("settings.autoCollapse.desc")}>
        <Toggle checked={settings.autoCollapseSidebar} onChange={(v) => update({ autoCollapseSidebar: v })} />
      </Row>
      {settings.autoCollapseSidebar && (
        <Row label={t("desktop.settings.collapseBelow.label")} desc={t("desktop.settings.collapseBelow.desc")}>
          <select
            className="st-select"
            value={settings.sidebarCollapseWidth}
            onChange={(e) => update({ sidebarCollapseWidth: Number(e.target.value) })}
          >
            <option value={700}>700 px</option>
            <option value={800}>800 px</option>
            <option value={900}>900 px</option>
            <option value={1000}>1000 px</option>
          </select>
        </Row>
      )}

      <div className="st-divider" />
      <div className="st-group-label">{t("settings.pdfExport")}</div>
      <Row label={t("settings.pdfColumnLayout.label")} desc={t("settings.pdfColumnLayout.descDesktop")}>
        <select
          className="st-select"
          value={settings.pdfColumnLayout}
          onChange={(e) => update({ pdfColumnLayout: Number(e.target.value) as 1 | 2 })}
        >
          {PDF_COLUMN_LAYOUT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label()}</option>
          ))}
        </select>
      </Row>

      <div className="st-divider" />
      <div className="st-group-label">{t("desktop.settings.updates")}</div>

      {appVersion && (
        <Row label={t("desktop.settings.version.label")} desc={t("desktop.settings.version.desc")}>
          <span className="st-version-badge">v{appVersion}</span>
        </Row>
      )}

      {updateManaged ? (
        <Row label={t("desktop.settings.autoUpdate.label")} desc={t("desktop.settings.autoUpdate.managedDesc")}>
          <span className="st-test-result">{t("desktop.settings.autoUpdate.managed")}</span>
        </Row>
      ) : (
        <Row label={t("desktop.settings.autoUpdate.label")} desc={t("desktop.settings.autoUpdate.desc")}>
          <Toggle checked={settings.autoUpdate} onChange={(v) => update({ autoUpdate: v })} />
        </Row>
      )}

      <div className="st-update-row" hidden={updateManaged}>
        {updateStatus === "idle" && (
          <button className="st-test-btn" onClick={handleCheckForUpdates}>
            {t("desktop.settings.updater.check")}
          </button>
        )}
        {updateStatus === "checking" && (
          <button className="st-test-btn" disabled>{t("desktop.settings.updater.checking")}</button>
        )}
        {updateStatus === "up-to-date" && (
          <div className="st-update-status">
            <span className="st-test-result st-test-ok">{t("desktop.settings.updater.upToDate")}</span>
            <button className="st-test-btn" onClick={handleCheckForUpdates}>{t("desktop.settings.updater.checkAgain")}</button>
          </div>
        )}
        {updateStatus === "available" && (
          <div className="st-update-status">
            <span className="st-update-version">{t("desktop.settings.updater.available", { version: updateInfo.version ?? "" })}</span>
            <button className="st-test-btn st-update-download-btn" onClick={handleDownloadUpdate}>
              {t("desktop.settings.updater.download")}
            </button>
          </div>
        )}
        {updateStatus === "downloading" && (
          <div className="st-update-status">
            <div className="st-update-progress-bar">
              <div className="st-update-progress-fill" style={{ width: `${updateInfo.percent ?? 0}%` }} />
            </div>
            <span className="st-update-percent">{Math.round(updateInfo.percent ?? 0)}%</span>
          </div>
        )}
        {updateStatus === "downloaded" && (
          <div className="st-update-status">
            <span className="st-test-result st-test-ok">{t("desktop.settings.updater.ready", { version: updateInfo.version ?? "" })}</span>
            <button className="st-test-btn st-update-install-btn" onClick={handleInstallUpdate}>
              {t("desktop.settings.updater.install")}
            </button>
          </div>
        )}
        {updateStatus === "error" && (
          <div className="st-update-status">
            <span className="st-test-result st-test-fail">{updateInfo.error || t("desktop.settings.updater.failed")}</span>
            <button className="st-test-btn" onClick={handleCheckForUpdates}>{t("desktop.settings.updater.retry")}</button>
          </div>
        )}
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="st-section">
      <Row label={t("settings.accent.label")} desc={t("settings.accent.descDesktop")}>
        <div className="st-colors">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              className={`st-swatch${settings.accentColor === c.value ? " st-swatch-active" : ""}`}
              style={{ background: c.value }}
              onClick={() => update({ accentColor: c.value })}
              title={c.label()}
            />
          ))}
        </div>
      </Row>
      <div className="st-divider" />
      <ThemePicker
        currentThemeId={settings.theme}
        vaultPath={vaultPath}
        onThemeSelect={(themeId) => update({ theme: themeId })}
      />
    </div>
  );

  const renderEditor = () => (
    <div className="st-section">
      <Row label={t("settings.fontSize.label")} desc={t("settings.fontSize.desc")}>
        <Stepper
          value={settings.fontSize}
          min={11}
          max={24}
          onChange={(v) => update({ fontSize: v })}
        />
      </Row>
      <Row label={t("settings.lineHeight.label")} desc={t("settings.lineHeight.desc")}>
        <Stepper
          value={settings.lineHeight}
          min={1.2}
          max={2.5}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => update({ lineHeight: v })}
        />
      </Row>
      <Row label={t("settings.editorFont.label")} desc={t("settings.editorFont.desc")}>
        <select
          className="st-select"
          value={settings.editorFont}
          onChange={(e) => update({ editorFont: e.target.value })}
        >
          {EDITOR_FONTS.map((f) => (
            <option key={f.value} value={f.value}>{f.name}</option>
          ))}
        </select>
      </Row>
      <Row label={t("settings.tabSize.label")} desc={t("settings.tabSize.desc")}>
        <select
          className="st-select"
          value={settings.tabSize}
          onChange={(e) => update({ tabSize: Number(e.target.value) })}
        >
          {[2, 4, 8].map((n) => (
            <option key={n} value={n}>{t("settings.tabSize.spaces", { count: n })}</option>
          ))}
        </select>
      </Row>
    </div>
  );

  const renderShortcuts = () => (
    <div className="st-section">
      <div className="st-shortcuts-header">
        <span className="st-hint">{t("settings.shortcuts.hint")}</span>
        <button onClick={resetAllHotkeys} className="st-reset-all">{t("settings.shortcuts.resetAll")}</button>
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
          placeholder={t("settings.shortcuts.search")}
          aria-label={t("settings.shortcuts.searchLabel")}
        />
        {shortcutQuery && (
          <button
            type="button"
            className="st-shortcut-search-clear"
            onClick={() => setShortcutQuery("")}
            aria-label={t("settings.shortcuts.clearLabel")}
          >
            {t("settings.shortcuts.clear")}
          </button>
        )}
      </div>
      {normalizedShortcutQuery && (
        <div className="st-shortcut-results">
          {t("settings.shortcuts.results", { count: filteredHotkeys.length })}
        </div>
      )}
      {categories.map((cat) => (
        filteredHotkeys.some((h) => h.category === cat) && (
          <div key={cat} className="st-shortcut-group">
            <div className="st-shortcut-cat">{categoryLabel(cat)}</div>
            {filteredHotkeys
              .filter((h) => h.category === cat)
            .map((h) => {
              const isRec = recording === h.action;
              const isDefault =
                DEFAULT_HOTKEYS.find((d) => d.action === h.action)?.keys === h.keys;

              return (
                <div key={h.action} className="st-shortcut-row">
                  <span className="st-shortcut-label">{hotkeyLabel(h)}</span>
                  <div className="st-shortcut-keys">
                    <button
                      onClick={() => setRecording(isRec ? null : h.action)}
                      className={`settings-key-btn${isRec ? " recording" : ""}`}
                    >
                      {isRec ? t("settings.shortcuts.recording") : formatHotkey(h.keys, platform)}
                    </button>
                    {!isDefault && (
                      <button
                        onClick={() => resetHotkey(h.action)}
                        className="settings-key-reset"
                        title={t("settings.shortcuts.reset")}
                      >
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
      ))}
      {normalizedShortcutQuery && filteredHotkeys.length === 0 && (
        <div className="st-shortcut-empty">{t("settings.shortcuts.empty", { query: shortcutQuery })}</div>
      )}
    </div>
  );

  // Updater state
  const [appVersion, setAppVersion] = useState("");
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "available" | "downloading" | "downloaded" | "error" | "up-to-date"
  >("idle");
  const [updateInfo, setUpdateInfo] = useState<{ version?: string; percent?: number; error?: string }>({});
  // True when the platform manages updates itself (Flatpak/Flathub) or self-update
  // is unavailable (portable). The whole update UI is hidden in that case.
  const [updateManaged, setUpdateManaged] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.updaterGetVersion) return;
    window.electronAPI.updaterGetVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.updaterIsManaged) return;
    window.electronAPI.updaterIsManaged().then(setUpdateManaged);
  }, []);

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.updaterCheck) return;
    setUpdateStatus("checking");
    setUpdateInfo({});
    const result = await window.electronAPI.updaterCheck();
    if (result.error) {
      setUpdateStatus("error");
      setUpdateInfo({ error: result.error });
    } else if (result.available) {
      setUpdateStatus("available");
      setUpdateInfo({ version: result.version });
    } else {
      setUpdateStatus("up-to-date");
    }
  };

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI?.updaterDownload) return;
    setUpdateStatus("downloading");
    setUpdateInfo((prev) => ({ ...prev, percent: 0 }));

    const cleanupProgress = window.electronAPI.onUpdaterDownloadProgress?.((data) => {
      setUpdateInfo((prev) => ({ ...prev, percent: data.percent }));
    });
    const cleanupDownloaded = window.electronAPI.onUpdaterUpdateDownloaded?.((data) => {
      setUpdateStatus("downloaded");
      setUpdateInfo({ version: data.version });
    });
    const cleanupError = window.electronAPI.onUpdaterError?.((data) => {
      setUpdateStatus("error");
      setUpdateInfo({ error: data.message });
    });

    const ok = await window.electronAPI.updaterDownload();
    if (!ok) {
      setUpdateStatus("error");
      setUpdateInfo({ error: t("desktop.settings.updater.downloadFailed") });
    }

    // Cleanup listeners after a delay to catch events
    setTimeout(() => {
      cleanupProgress?.();
      cleanupDownloaded?.();
      cleanupError?.();
    }, 60000);
  };

  const handleInstallUpdate = () => {
    window.electronAPI?.updaterInstall?.();
  };

  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // ── Git remote + GitHub auth (per-vault) ──
  const [ghUser, setGhUser] = useState<GitHubUser | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  const [editingToken, setEditingToken] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState(vault?.gitRemote || "");
  const [remoteError, setRemoteError] = useState("");
  const [savingRemote, setSavingRemote] = useState(false);
  const [remoteSaved, setRemoteSaved] = useState(false);

  // Reset remote URL when vault changes
  useEffect(() => {
    setRemoteUrl(vault?.gitRemote || "");
    setRemoteError("");
    setRemoteSaved(false);
    setTokenInput("");
    setUsernameInput("");
    setTokenError("");
    setEditingToken(false);
  }, [vault?.id, vault?.gitRemote]);

  // Load GitHub user when sync section is active
  useEffect(() => {
    if (active !== "sync" || !vault?.id || !window.electronAPI) return;
    let cancelled = false;
    (async () => {
      try {
        const [u, has] = await Promise.all([
          window.electronAPI!.authGetUser(vault.id),
          window.electronAPI!.authHasToken(vault.id),
        ]);
        if (!cancelled) { setGhUser(u); setHasToken(has); }
      } catch {
        if (!cancelled) { setGhUser(null); setHasToken(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [active, vault?.id]);

  const handleSaveRemote = async () => {
    if (!window.electronAPI || !vault) return;
    setSavingRemote(true);
    setRemoteError("");
    setRemoteSaved(false);
    try {
      const status = await window.electronAPI.gitStatus(vault.path);
      if (!status.isRepo) {
        await window.electronAPI.gitInit(vault.path);
      }
      const trimmed = remoteUrl.trim();
      if (trimmed) {
        await window.electronAPI.gitSetRemote(vault.path, trimmed);
      }
      const updated = await window.electronAPI.updateVault(vault.id, {
        gitRemote: trimmed || null,
      });
      if (updated) onVaultUpdate(updated);
      setRemoteSaved(true);
    } catch (err: unknown) {
      setRemoteError(err instanceof Error ? err.message : t("desktop.sync.remote.saveFailed"));
    } finally {
      setSavingRemote(false);
    }
  };

  const submitToken = async () => {
    if (!window.electronAPI || !vault) return;
    const trimmed = tokenInput.trim();
    if (!trimmed) { setTokenError(t("desktop.sync.credentials.required")); return; }
    const username = usernameInput.trim();
    const { isGitHub } = gitHostInfo(vault.gitRemote || remoteUrl);
    setSavingToken(true);
    setTokenError("");
    try {
      // Only GitHub exposes an API we can validate the token against (and fetch
      // the user's avatar/name). For any other host — GitLab, Gitea/Forgejo,
      // Bitbucket, self-hosted — save the credentials as entered.
      if (isGitHub) {
        const result = await window.electronAPI.authValidateToken(trimmed);
        if (!result.valid) {
          setTokenError(result.error || t("desktop.sync.credentials.invalid"));
          return;
        }
        await window.electronAPI.authSaveToken(vault.id, trimmed, username || undefined);
        setGhUser(result);
      } else {
        await window.electronAPI.authSaveToken(vault.id, trimmed, username || undefined);
        setGhUser(null);
      }
      setHasToken(true);
      setTokenInput("");
      setUsernameInput("");
      setEditingToken(false);
    } catch (err: unknown) {
      setTokenError(err instanceof Error ? err.message : t("desktop.sync.credentials.saveFailed"));
    } finally {
      setSavingToken(false);
    }
  };

  const handleDisconnectToken = async () => {
    if (!window.electronAPI || !vault) return;
    await window.electronAPI.authRemoveToken(vault.id);
    setGhUser(null);
    setHasToken(false);
  };

  const handleTestConnection = async () => {
    if (!window.electronAPI) return;
    setTesting(true);
    setTestResult(null);
    try {
      const provider = settings.extraSyncProvider as SyncProviderType;
      const config =
        provider === "folder" ? settings.folderSync :
        provider === "webdav" ? settings.webdavSync : null;
      if (!config) return;
      const result = await window.electronAPI.syncProviderTest(provider, config);
      setTestResult(result);
    } catch (e: unknown) {
      setTestResult({ ok: false, error: e instanceof Error ? e.message : t("desktop.sync.unknownError") });
    } finally {
      setTesting(false);
    }
  };

  const renderSync = () => {
    const isConnected = hasToken || !!ghUser?.valid;
    const showTokenInput = !isConnected || editingToken;
    const remoteDirty = (vault?.gitRemote || "") !== remoteUrl.trim();
    const hostInfo = gitHostInfo(vault?.gitRemote || remoteUrl);

    return (
    <div className="st-section">
      <div className="st-group-label">{t("desktop.sync.gitRepo")}</div>
      {!vault ? (
        <div className="st-row-desc" style={{ padding: "8px 0" }}>
          {t("desktop.sync.openVault")}
        </div>
      ) : (
        <>
          <Row label={t("desktop.sync.remote.label")} desc={t("desktop.sync.remote.desc")}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="text"
                className="st-text-input"
                value={remoteUrl}
                onChange={(e) => { setRemoteUrl(e.target.value); setRemoteSaved(false); }}
                placeholder="https://gitlab.com/user/repo.git"
                style={{ minWidth: 240 }}
              />
              <button
                type="button"
                className="st-test-btn"
                onClick={handleSaveRemote}
                disabled={savingRemote || !remoteDirty}
              >
                {savingRemote ? t("desktop.sync.saving") : t("desktop.sync.save")}
              </button>
            </div>
          </Row>
          {remoteError && (
            <div className="st-test-result st-test-fail" style={{ padding: "0 0 8px" }}>
              {remoteError}
            </div>
          )}
          {remoteSaved && !remoteError && (
            <div className="st-test-result st-test-ok" style={{ padding: "0 0 8px" }}>
              {t("desktop.sync.saved")}
            </div>
          )}

          <Row label={t("desktop.sync.credentials.label")} desc={t("desktop.sync.credentials.desc")}>
            {hostInfo.tokenPageUrl && (
              <button
                type="button"
                className="st-test-btn"
                onClick={() => window.electronAPI?.openExternal(hostInfo.tokenPageUrl!)}
              >
                {t("desktop.sync.credentials.generate")}
              </button>
            )}
          </Row>

          {isConnected && !editingToken && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
              {ghUser?.avatar && (
                <img src={ghUser.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="st-row-label" style={{ fontSize: 12 }}>
                  {ghUser?.valid ? (ghUser.name || ghUser.username) : t("desktop.sync.credentials.tokenSaved")}
                </div>
                <div className="st-row-desc" style={{ color: "var(--green)" }}>
                  {ghUser?.valid ? `@${ghUser.username}` : t("desktop.sync.credentials.encrypted")}
                </div>
              </div>
              <button
                type="button"
                className="st-test-btn"
                onClick={() => { setEditingToken(true); setTokenInput(""); setUsernameInput(""); setTokenError(""); }}
              >
                {t("desktop.sync.credentials.change")}
              </button>
              <button
                type="button"
                className="st-test-btn"
                onClick={handleDisconnectToken}
              >
                {t("desktop.sync.credentials.disconnect")}
              </button>
            </div>
          )}

          {showTokenInput && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0" }}>
              {!hostInfo.isGitHub && (
                <input
                  type="text"
                  className="st-text-input"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder={t("desktop.sync.credentials.usernamePlaceholder")}
                  onKeyDown={(e) => { if (e.key === "Enter" && tokenInput.trim() && !savingToken) submitToken(); }}
                  style={{ width: "100%" }}
                />
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="password"
                  className="st-text-input"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={hostInfo.isGitHub ? "ghp_xxxx..." : t("desktop.sync.credentials.tokenPlaceholder")}
                  onKeyDown={(e) => { if (e.key === "Enter" && tokenInput.trim() && !savingToken) submitToken(); }}
                  style={{ flex: 1, fontFamily: "var(--font-mono, monospace)" }}
                />
                <button
                  type="button"
                  className="st-test-btn"
                  onClick={submitToken}
                  disabled={!tokenInput.trim() || savingToken}
                >
                  {savingToken ? "..." : t("desktop.sync.save")}
                </button>
                {editingToken && (
                  <button
                    type="button"
                    className="st-test-btn"
                    onClick={() => { setEditingToken(false); setTokenError(""); setTokenInput(""); setUsernameInput(""); }}
                  >
                    {t("desktop.sync.cancel")}
                  </button>
                )}
              </div>
              {!hostInfo.isGitHub && (
                <div className="st-row-desc">
                  {t("desktop.sync.credentials.hint")} <code>x-token-auth</code>.
                </div>
              )}
              {tokenError && (
                <div className="st-test-result st-test-fail">{tokenError}</div>
              )}
            </div>
          )}
        </>
      )}

      <div className="st-divider" />
      <div className="st-group-label">{t("desktop.sync.gitSync")}</div>
      <Row label={t("desktop.sync.interval.label")} desc={t("desktop.sync.interval.desc")}>
        <select
          className="st-select"
          value={settings.gitSyncInterval}
          onChange={(e) => update({ gitSyncInterval: Number(e.target.value) })}
        >
          {SYNC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label()}</option>
          ))}
        </select>
      </Row>
      <Row label={t("desktop.sync.onSave.label")} desc={t("desktop.sync.onSave.desc")}>
        <Toggle checked={settings.syncOnSave} onChange={(v) => update({ syncOnSave: v })} />
      </Row>
      <Row label={t("desktop.sync.pullOnOpen.label")} desc={t("desktop.sync.pullOnOpen.desc")}>
        <Toggle checked={settings.pullOnOpen} onChange={(v) => update({ pullOnOpen: v })} />
      </Row>
      <Row label={t("desktop.sync.commitMessage.label")} desc={t("desktop.sync.commitMessage.desc")}>
        <input
          type="text"
          className="st-text-input"
          value={settings.commitMessageFormat}
          onChange={(e) => update({ commitMessageFormat: e.target.value })}
          placeholder="Sync {date} {time}"
        />
      </Row>

      <div className="st-divider" />
      <div className="st-group-label">{t("desktop.sync.extra")}</div>
      <Row label={t("desktop.sync.provider.label")} desc={t("desktop.sync.provider.desc")}>
        <select
          className="st-select"
          value={settings.extraSyncProvider}
          onChange={(e) => {
            update({ extraSyncProvider: e.target.value as SyncProviderType });
            setTestResult(null);
          }}
        >
          {SYNC_PROVIDERS.map((p) => (
            <option key={p.type} value={p.type}>{p.name()}</option>
          ))}
        </select>
      </Row>
      {settings.extraSyncProvider !== "none" && (
        <div className="st-provider-desc">
          {SYNC_PROVIDERS.find((p) => p.type === settings.extraSyncProvider)?.description()}
        </div>
      )}

      {/* Folder config */}
      {settings.extraSyncProvider === "folder" && (
        <>
          <Row label={t("desktop.sync.targetFolder.label")} desc={t("desktop.sync.targetFolder.desc")}>
            <input
              type="text"
              className="st-text-input"
              value={settings.folderSync.targetPath}
              onChange={(e) => update({ folderSync: { ...settings.folderSync, targetPath: e.target.value } })}
              placeholder="/home/user/Google Drive/Notes"
            />
          </Row>
          <Row label={t("desktop.sync.direction.label")} desc={t("desktop.sync.direction.desc")}>
            <select
              className="st-select"
              value={settings.folderSync.direction}
              onChange={(e) => update({ folderSync: { ...settings.folderSync, direction: e.target.value as "push" | "pull" | "both" } })}
            >
              {FOLDER_DIRECTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label()}</option>
              ))}
            </select>
          </Row>
        </>
      )}

      {/* WebDAV config */}
      {settings.extraSyncProvider === "webdav" && (
        <>
          <Row label={t("desktop.sync.serverUrl.label")} desc={t("desktop.sync.serverUrl.desc")}>
            <input
              type="text"
              className="st-text-input"
              value={settings.webdavSync.url}
              onChange={(e) => update({ webdavSync: { ...settings.webdavSync, url: e.target.value } })}
              placeholder="https://cloud.example.com/remote.php/dav"
            />
          </Row>
          <Row label={t("desktop.sync.username.label")} desc={t("desktop.sync.username.desc")}>
            <input
              type="text"
              className="st-text-input"
              value={settings.webdavSync.username}
              onChange={(e) => update({ webdavSync: { ...settings.webdavSync, username: e.target.value } })}
            />
          </Row>
          <Row label={t("desktop.sync.password.label")} desc={t("desktop.sync.password.desc")}>
            <input
              type="password"
              className="st-text-input"
              value={settings.webdavSync.password}
              onChange={(e) => update({ webdavSync: { ...settings.webdavSync, password: e.target.value } })}
            />
          </Row>
          <Row label={t("desktop.sync.remotePath.label")} desc={t("desktop.sync.remotePath.desc")}>
            <input
              type="text"
              className="st-text-input"
              value={settings.webdavSync.remotePath}
              onChange={(e) => update({ webdavSync: { ...settings.webdavSync, remotePath: e.target.value } })}
              placeholder="/Noteriv"
            />
          </Row>
        </>
      )}

      {/* Test connection button */}
      {settings.extraSyncProvider !== "none" && (
        <div className="st-test-row">
          <button
            className="st-test-btn"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? t("desktop.sync.testing") : t("desktop.sync.test")}
          </button>
          {testResult && (
            <span className={`st-test-result ${testResult.ok ? "st-test-ok" : "st-test-fail"}`}>
              {testResult.ok ? t("desktop.sync.connected") : testResult.error || t("desktop.sync.failed")}
            </span>
          )}
        </div>
      )}
    </div>
    );
  };

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
          <span className="st-ecosystem-title">{t("settings.ecosystem.plugins")}</span>
          <span className="st-ecosystem-desc">{t("settings.ecosystem.pluginsDesc")}</span>
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
          <span className="st-ecosystem-title">{t("settings.ecosystem.snippets")}</span>
          <span className="st-ecosystem-desc">{t("settings.ecosystem.snippetsDesc")}</span>
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
          <span className="st-ecosystem-title">{t("settings.ecosystem.themes")}</span>
          <span className="st-ecosystem-desc">{t("settings.ecosystem.themesDesc")}</span>
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
    sync: renderSync,
    corePlugins: () => (
      <CorePluginsSection
        plugins={corePlugins}
        onToggle={(id, enabled) => onToggleCorePlugin?.(id, enabled)}
        settingsTabs={corePluginSettingsTabs}
      />
    ),
    ecosystem: renderEcosystem,
  };

  return (
    <div ref={overlayRef} className="settings-overlay" onClick={handleBackdrop}>
      <div className="settings-modal">
        {/* Sidebar navigation */}
        <div className="st-nav">
          <div className="st-nav-title">{t("settings.title")}</div>
          {SECTIONS.map((id) => (
            <button
              key={id}
              className={`st-nav-item${active === id ? " st-nav-active" : ""}`}
              onClick={() => setActive(id)}
            >
              <SectionIcon section={id} />
              <span>{t(`settings.sections.${id}`)}</span>
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="st-main">
          <div className="st-header">
            <h2 className="st-title">
              {t(`settings.sections.${active}`)}
            </h2>
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

/** A hotkey's name and category in the current language (the table's English when the catalog lacks it). */
const hotkeyLabel = (h: HotkeyBinding) => tOr(`hotkeys.${h.action}`, h.label);
const categoryLabel = (category: string) => tOr(`hotkeys.category.${category.toLowerCase()}`, category);

// ── Reusable controls ──

function Row({
  label,
  desc,
  children,
}: {
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="st-row">
      <div className="st-row-info">
        <span className="st-row-label">{label}</span>
        <span className="st-row-desc">{desc}</span>
      </div>
      <div className="st-row-control">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      className={`st-toggle${checked ? " st-toggle-on" : ""}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="st-toggle-thumb" />
    </button>
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
      <button onClick={dec} disabled={value <= min}>-</button>
      <span>{format ? format(value) : value}</span>
      <button onClick={inc} disabled={value >= max}>+</button>
    </div>
  );
}

function SectionIcon({ section }: { section: Section }) {
  const icons: Record<Section, React.JSX.Element> = {
    general: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    appearance: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="10" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
    editor: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    shortcuts: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4 6h1M7 6h2M11 6h1M5 9h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    sync: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M2 8a6 6 0 0110.5-4M14 8a6 6 0 01-10.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M12 2v3h-3M4 14v-3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    corePlugins: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M11.5 9v5M9 11.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    ecosystem: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5L2 4.5v4l6 3 6-3v-4L8 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M2 4.5L8 7.5l6-3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M8 7.5v4.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  };
  return icons[section];
}
