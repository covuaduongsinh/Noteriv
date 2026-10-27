import React, { useState, useRef, useEffect } from "react";
import type { AiProviderConfig, AiReasoningEffort, AiImageAttachment } from "@noteriv/core";

export interface ModelEffortToolbarProps {
  provider: AiProviderConfig;
  onProviderChange: (updated: AiProviderConfig) => void;
  onAttachImage?: (img: AiImageAttachment) => void;
  onOpenSettings?: () => void;
}

export interface PresetModelOption {
  id: string;
  name: string;
  model: string;
  kind: AiProviderConfig["kind"];
  supportsReasoning?: boolean;
  group: "subscription" | "reasoning" | "direct" | "local";
}

export const PRESET_MODELS: PresetModelOption[] = [
  // Subscription Models (Free Tokens)
  {
    id: "claude-sdk",
    name: "Claude Code (Claude Pro/Max)",
    model: "claude-3-5-sonnet-latest",
    kind: "cli",
    supportsReasoning: true,
    group: "subscription",
  },
  {
    id: "codex-oauth",
    name: "ChatGPT Plus (Codex OAuth)",
    model: "gpt-4o",
    kind: "oauth",
    supportsReasoning: false,
    group: "subscription",
  },
  {
    id: "antigravity-cli",
    name: "Antigravity Agentic CLI",
    model: "gemini-2.0-flash",
    kind: "cli",
    supportsReasoning: true,
    group: "subscription",
  },

  // Deep Reasoning Models
  {
    id: "deepseek",
    name: "DeepSeek R1 (Reasoning)",
    model: "deepseek-reasoner",
    kind: "api",
    supportsReasoning: true,
    group: "reasoning",
  },
  {
    id: "deepseek",
    name: "DeepSeek V3 (Chat)",
    model: "deepseek-chat",
    kind: "api",
    supportsReasoning: false,
    group: "reasoning",
  },
  {
    id: "openai-api",
    name: "OpenAI o3-mini (Reasoning)",
    model: "o3-mini",
    kind: "api",
    supportsReasoning: true,
    group: "reasoning",
  },

  // Direct & Multimodal Models
  {
    id: "gemini-api",
    name: "Google Gemini 2.0 Flash",
    model: "gemini-2.0-flash",
    kind: "api",
    supportsReasoning: false,
    group: "direct",
  },
  {
    id: "grok",
    name: "xAI Grok-2 (Vision)",
    model: "grok-2-latest",
    kind: "api",
    supportsReasoning: true,
    group: "direct",
  },
  {
    id: "openai-api",
    name: "OpenAI GPT-4o (Vision)",
    model: "gpt-4o",
    kind: "api",
    supportsReasoning: false,
    group: "direct",
  },

  // Local / Offline
  {
    id: "ollama",
    name: "Ollama Local (Offline)",
    model: "llama3.2",
    kind: "local",
    supportsReasoning: false,
    group: "local",
  },
];

export const ModelEffortToolbar: React.FC<ModelEffortToolbarProps> = ({
  provider,
  onProviderChange,
  onAttachImage,
  onOpenSettings,
}) => {
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showEffortMenu, setShowEffortMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
        setShowEffortMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentEffort: AiReasoningEffort = provider.reasoningEffort || "none";

  const handleSelectModel = (preset: PresetModelOption) => {
    onProviderChange({
      ...provider,
      id: preset.id,
      name: preset.name,
      model: preset.model,
      kind: preset.kind,
    });
    setShowModelMenu(false);
  };

  const handleSelectEffort = (effort: AiReasoningEffort) => {
    onProviderChange({
      ...provider,
      reasoningEffort: effort,
    });
    setShowEffortMenu(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAttachImage) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onAttachImage({
        mimeType: file.type || "image/png",
        data: result,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const effortLabels: Record<AiReasoningEffort, { icon: string; label: string }> = {
    none: { icon: "⚡", label: "Tắt" },
    low: { icon: "🧠", label: "Thấp" },
    medium: { icon: "🧠", label: "Vừa" },
    high: { icon: "🔥", label: "Cao" },
    max: { icon: "💥", label: "Max" },
  };

  return (
    <div
      ref={toolbarRef}
      className="flex items-center justify-between px-2.5 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] select-none relative"
    >
      {/* Left: Model Picker & Effort Level */}
      <div className="flex items-center gap-1.5">
        {/* Model Selector Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowModelMenu((prev) => !prev);
              setShowEffortMenu(false);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-modifier-hover)] text-[var(--text-primary)] font-medium text-[11px] transition-colors max-w-[145px] truncate"
            title="Đổi mô hình AI nhanh"
          >
            <span className="truncate">{provider.name || provider.model || "Chọn mô hình"}</span>
            <span className="text-[10px] text-[var(--text-secondary)] opacity-70">▾</span>
          </button>

          {/* Model Menu Dropdown */}
          {showModelMenu && (
            <div className="absolute bottom-full left-0 mb-1.5 w-64 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded shadow-xl py-1 z-50 text-xs overflow-hidden max-h-72 overflow-y-auto">
              <div className="px-2.5 py-1 font-semibold text-[10px] text-[var(--text-muted)] tracking-wider uppercase border-b border-[var(--border-subtle)]">
                Gói Thuê Bao (Miễn phí Token)
              </div>
              {PRESET_MODELS.filter((p) => p.group === "subscription").map((p) => (
                <button
                  key={`${p.id}-${p.model}`}
                  type="button"
                  onClick={() => handleSelectModel(p)}
                  className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between hover:bg-[var(--bg-modifier-hover)] ${
                    provider.id === p.id && provider.model === p.model ? "text-[var(--interactive-accent, #3b82f6)] font-semibold" : ""
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {p.supportsReasoning && <span className="text-[10px] opacity-75">🧠</span>}
                </button>
              ))}

              <div className="px-2.5 py-1 font-semibold text-[10px] text-[var(--text-muted)] tracking-wider uppercase border-t border-b border-[var(--border-subtle)] mt-1">
                Mô hình Suy Luận Sâu (Reasoning)
              </div>
              {PRESET_MODELS.filter((p) => p.group === "reasoning").map((p) => (
                <button
                  key={`${p.id}-${p.model}`}
                  type="button"
                  onClick={() => handleSelectModel(p)}
                  className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between hover:bg-[var(--bg-modifier-hover)] ${
                    provider.id === p.id && provider.model === p.model ? "text-[var(--interactive-accent, #3b82f6)] font-semibold" : ""
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-[10px] opacity-75">🧠</span>
                </button>
              ))}

              <div className="px-2.5 py-1 font-semibold text-[10px] text-[var(--text-muted)] tracking-wider uppercase border-t border-b border-[var(--border-subtle)] mt-1">
                Đa Phương Tiện & Trực Tiếp (BYOK)
              </div>
              {PRESET_MODELS.filter((p) => p.group === "direct" || p.group === "local").map((p) => (
                <button
                  key={`${p.id}-${p.model}`}
                  type="button"
                  onClick={() => handleSelectModel(p)}
                  className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between hover:bg-[var(--bg-modifier-hover)] ${
                    provider.id === p.id && provider.model === p.model ? "text-[var(--interactive-accent, #3b82f6)] font-semibold" : ""
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {p.group === "local" ? <span className="text-[10px] opacity-75">💻</span> : <span className="text-[10px] opacity-75">👁️</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reasoning / Thinking Effort Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowEffortMenu((prev) => !prev);
              setShowModelMenu(false);
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-modifier-hover)] text-[11px] transition-colors"
            title="Mức độ tư duy / suy luận (Thinking Effort)"
          >
            <span>{effortLabels[currentEffort].icon}</span>
            <span className="text-[10px]">{effortLabels[currentEffort].label}</span>
          </button>

          {/* Effort Menu Dropdown */}
          {showEffortMenu && (
            <div className="absolute bottom-full left-0 mb-1.5 w-32 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded shadow-xl py-1 z-50 text-xs">
              <div className="px-2 py-0.5 font-semibold text-[9px] text-[var(--text-muted)] tracking-wider uppercase">
                Mức độ tư duy
              </div>
              {(["none", "low", "medium", "high", "max"] as AiReasoningEffort[]).map((eff) => (
                <button
                  key={eff}
                  type="button"
                  onClick={() => handleSelectEffort(eff)}
                  className={`w-full text-left px-2 py-1 flex items-center gap-1.5 hover:bg-[var(--bg-modifier-hover)] ${
                    currentEffort === eff ? "text-[var(--interactive-accent, #3b82f6)] font-semibold" : ""
                  }`}
                >
                  <span>{effortLabels[eff].icon}</span>
                  <span>{effortLabels[eff].label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Image Attachment Button & Settings */}
      <div className="flex items-center gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1 rounded hover:bg-[var(--bg-modifier-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="Đính kèm ảnh hoặc dán ảnh (Ctrl+V)"
        >
          📎
        </button>

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1 rounded hover:bg-[var(--bg-modifier-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Cài đặt AI chi tiết"
          >
            ⚙️
          </button>
        )}
      </div>
    </div>
  );
};

export default ModelEffortToolbar;
