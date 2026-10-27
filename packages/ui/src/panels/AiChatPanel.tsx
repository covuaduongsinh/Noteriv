import React, { useState, useRef, useEffect } from "react";
import type { VaultAdapter, NoteRef, AiMessage, AiProviderConfig, AiContextRef } from "@noteriv/core";
import { createVfsTools, buildPromptWithContext, GitSafetyNet, wrapAdapterWithSafetyNet } from "@noteriv/core";
import { streamChat } from "@noteriv/ai-hub";
import ContextUsageMeter from "./ContextUsageMeter";

export interface AiChatPanelProps {
  adapter: VaultAdapter;
  activeNotePath?: string | null;
  onOpenNote?: (path: string) => void;
  provider: AiProviderConfig;
  onOpenSettings?: () => void;
  safetyNet?: GitSafetyNet;
}

export const AiChatPanel: React.FC<AiChatPanelProps> = ({
  adapter,
  activeNotePath,
  onOpenNote,
  provider,
  onOpenSettings,
  safetyNet: initialSafetyNet,
}) => {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [usedTokens, setUsedTokens] = useState(1200);
  const [maxTokens] = useState(128000);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [vaultNotes, setVaultNotes] = useState<NoteRef[]>([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const [safetyNet] = useState(() => initialSafetyNet || new GitSafetyNet());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load vault notes for @mention autocomplete
  useEffect(() => {
    adapter.listNotes().then(setVaultNotes).catch(() => {});
  }, [adapter]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle @mention trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf("@");

    if (lastAt !== -1 && !textBeforeCursor.slice(lastAt + 1).includes(" ")) {
      setMentionQuery(textBeforeCursor.slice(lastAt + 1).toLowerCase());
      setSelectedMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (note: NoteRef) => {
    const cursorPos = input.lastIndexOf("@");
    if (cursorPos === -1) return;
    const nextInput = input.slice(0, cursorPos) + `[[${note.name.replace(/\.md$/i, "")}]] ` + input.slice(cursorPos + 1 + (mentionQuery?.length || 0));
    setInput(nextInput);
    setMentionQuery(null);
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userText = input.trim();
    setInput("");
    setMentionQuery(null);

    // Build context
    const context: AiContextRef = {};
    if (activeNotePath) {
      context.activeNote = { path: activeNotePath };
    }

    const fullPrompt = buildPromptWithContext(userText, context);

    const userMsg: AiMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: userText,
      createdAt: Date.now(),
    };

    const assistantMsgId = `asst-${Date.now()}`;
    const initialAssistantMsg: AiMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setIsGenerating(true);

    const wrappedAdapter = wrapAdapterWithSafetyNet(adapter, safetyNet);
    const vfsTools = createVfsTools(wrappedAdapter);
    const toolDefs = vfsTools.getToolDefinitions();

    try {
      const allMessages = [...messages, userMsg];
      const stream = streamChat({
        provider,
        messages: allMessages,
        tools: toolDefs,
      });

      let accumulatedText = "";

      for await (const event of stream) {
        if (event.type === "text_delta") {
          accumulatedText += event.text;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: accumulatedText } : m))
          );
        } else if (event.type === "tool_call_started") {
          // Tool invocation executed by VFS
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    toolCalls: [...(m.toolCalls || []), event.toolCall],
                  }
                : m
            )
          );
          // Execute tool in client
          try {
            const toolResult = await vfsTools.executeTool(
              event.toolCall.name,
              event.toolCall.arguments
            );
            // In full loop, this feeds back to next turn; here we record success
          } catch (err: any) {
            // Record tool error
          }
        } else if (event.type === "usage") {
          setUsedTokens((prev) => prev + event.inputTokens + event.outputTokens);
        } else if (event.type === "error") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: m.content + `\n\n*(Error: ${event.message})*` }
                : m
            )
          );
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: m.content + `\n\n*(Failed: ${err.message})*` }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredNotes = mentionQuery !== null
    ? vaultNotes.filter((n) => n.path.toLowerCase().includes(mentionQuery)).slice(0, 5)
    : [];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Noteriv AI</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-modifier-hover)] text-[var(--text-secondary)]">
            {provider.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ContextUsageMeter usedTokens={usedTokens} maxTokens={maxTokens} />
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-modifier-hover)]"
              title="AI Settings"
            >
              ⚙
            </button>
          )}
        </div>
      </div>

      {/* Active Note Indicator */}
      {activeNotePath && (
        <div className="px-3 py-1 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
          <span className="truncate">Context: 📄 {activeNotePath}</span>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[var(--text-secondary)] p-4 text-xs space-y-2">
            <span className="text-2xl">✨</span>
            <p className="font-medium text-sm text-[var(--text-primary)]">Hỏi đáp & Tương tác Vault</p>
            <p>Hỏi bất kỳ điều gì về ghi chú, gõ @ để nhắc đến file, hoặc bôi đen văn bản bấm Ctrl+K để chỉnh sửa trực tiếp.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-[var(--interactive-accent, #3b82f6)] text-white"
                    : "bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content || (isGenerating && m.role === "assistant" ? "Đang suy nghĩ..." : "")}</div>

                {/* Render Tool Invocations */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] space-y-1 text-xs">
                    {m.toolCalls.map((tc) => (
                      <div key={tc.id} className="flex items-center gap-1.5 text-[var(--text-secondary)] font-mono">
                        <span>⚡ {tc.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Mention Popup */}
      {mentionQuery !== null && filteredNotes.length > 0 && (
        <div className="mx-3 mb-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded shadow-lg overflow-hidden text-xs">
          {filteredNotes.map((n, idx) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleSelectMention(n)}
              className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--bg-modifier-hover)] ${
                idx === selectedMentionIndex ? "bg-[var(--bg-modifier-hover)] font-medium" : ""
              }`}
            >
              <span>📄</span>
              <span className="truncate">{n.path}</span>
            </button>
          ))}
        </div>
      )}

      {/* Composer Input */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Hỏi AI hoặc gõ @ để chọn file..."
            rows={2}
            className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-md px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:border-[var(--interactive-accent, #3b82f6)]"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="self-end px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--interactive-accent, #3b82f6)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {isGenerating ? "..." : "Gửi"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiChatPanel;
