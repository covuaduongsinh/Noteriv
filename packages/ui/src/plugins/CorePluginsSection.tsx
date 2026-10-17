"use client";

import type { CorePluginInfo } from "@noteriv/core/plugin-registry";

/** Visible text. Each app words these for its own audience. */
export interface CorePluginsLabels {
  intro: string;
  empty: string;
  loading: string;
  failed: string;
  enable: string;
  disable: string;
}

const DEFAULT_LABELS: CorePluginsLabels = {
  intro: "Built-in plugins that ship with Noteriv. A disabled plugin's code is not loaded.",
  empty: "No core plugins.",
  loading: "Loading…",
  failed: "Failed to load",
  enable: "Enable",
  disable: "Disable",
};

export interface CorePluginsSectionProps {
  plugins: CorePluginInfo[];
  onToggle: (id: string, enabled: boolean) => void;
  labels?: Partial<CorePluginsLabels>;
}

/** Settings section listing core plugins with an on/off switch each (same row and toggle styles as Settings). */
export default function CorePluginsSection({ plugins, onToggle, labels }: CorePluginsSectionProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  return (
    <div className="st-section">
      <div className="st-row-desc" style={{ padding: "4px 0 8px" }}>
        {text.intro}
      </div>
      {plugins.length === 0 && <div className="st-row-desc">{text.empty}</div>}
      {plugins.map((p) => {
        const on = p.enabled;
        return (
          <div className="st-row" key={p.id} data-core-plugin={p.id}>
            <div className="st-row-info">
              <span className="st-row-label">{p.name}</span>
              <span className="st-row-desc">{p.description}</span>
              {p.status === "loading" && <span className="st-row-desc">{text.loading}</span>}
              {p.error && (
                <span className="st-row-desc" style={{ color: "var(--red, #f38ba8)" }}>
                  {p.status === "error" ? `${text.failed}: ` : ""}
                  {p.error}
                </span>
              )}
            </div>
            <div className="st-row-control">
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${on ? text.disable : text.enable} ${p.name}`}
                className={`st-toggle${on ? " st-toggle-on" : ""}`}
                disabled={p.status === "loading"}
                onClick={() => onToggle(p.id, !on)}
              >
                <span className="st-toggle-thumb" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
