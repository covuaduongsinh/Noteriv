"use client";

import type { HostPanel, HostRibbonIcon, HostStatusItem } from "./core-plugin-host";

function RibbonGlyph({ icon, title }: { icon?: string; title: string }) {
  return icon?.trim().startsWith("<svg") ? (
    <span style={{ display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: icon }} />
  ) : (
    <span style={{ fontSize: 12, fontWeight: 600 }}>{(icon && icon.length <= 2 ? icon : title.charAt(0)).toUpperCase()}</span>
  );
}

/**
 * Ribbon buttons for core plugins, plus one toggle per sidebar panel (`ui.addSidebarPanel`, shown by
 * CorePluginSidePanels). `icon` may be an inline `<svg>` string: core plugins are trusted code from this repo
 * (community plugins never reach this component), so it is inserted as markup.
 */
export function CorePluginRibbonButtons({
  icons,
  panels = [],
  openPanels = [],
  onTogglePanel,
  className = "ribbon-btn",
}: {
  icons: HostRibbonIcon[];
  panels?: HostPanel[];
  openPanels?: string[];
  onTogglePanel?: (key: string) => void;
  className?: string;
}) {
  return (
    <>
      {icons.map((r) => (
        <button key={r.key} className={className} title={r.title} aria-label={r.title} onClick={() => r.onClick()} data-core-ribbon={r.key}>
          <RibbonGlyph icon={r.icon} title={r.title} />
        </button>
      ))}
      {onTogglePanel &&
        panels.map((p) => (
          <button
            key={p.key}
            className={className}
            title={p.title}
            aria-label={p.title}
            aria-pressed={openPanels.includes(p.key)}
            onClick={() => onTogglePanel(p.key)}
            data-core-panel-toggle={p.key}
            style={openPanels.includes(p.key) ? { color: "var(--accent)" } : undefined}
          >
            <RibbonGlyph icon={p.icon} title={p.title} />
          </button>
        ))}
    </>
  );
}

/** Status bar entries for core plugins; clickable ones become buttons. */
export function CorePluginStatusItems({ items, buttonClassName }: { items: HostStatusItem[]; buttonClassName?: string }) {
  return (
    <>
      {items.map((item) =>
        item.onClick ? (
          <button key={item.key} title={item.title} className={buttonClassName} onClick={() => item.onClick?.()} data-core-status={item.key}>
            {item.text}
          </button>
        ) : (
          <span key={item.key} title={item.title} data-core-status={item.key}>
            {item.text}
          </span>
        )
      )}
    </>
  );
}
