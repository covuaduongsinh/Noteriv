"use client";

import type { HostRibbonIcon, HostStatusItem } from "./core-plugin-host";

/**
 * Ribbon buttons for core plugins. `icon` may be an inline `<svg>` string: core plugins are trusted code from this
 * repo (community plugins never reach this component), so it is inserted as markup.
 */
export function CorePluginRibbonButtons({ icons, className = "ribbon-btn" }: { icons: HostRibbonIcon[]; className?: string }) {
  return (
    <>
      {icons.map((r) => (
        <button key={r.key} className={className} title={r.title} aria-label={r.title} onClick={() => r.onClick()} data-core-ribbon={r.key}>
          {r.icon?.trim().startsWith("<svg") ? (
            <span style={{ display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: r.icon }} />
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600 }}>{(r.icon && r.icon.length <= 2 ? r.icon : r.title.charAt(0)).toUpperCase()}</span>
          )}
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
