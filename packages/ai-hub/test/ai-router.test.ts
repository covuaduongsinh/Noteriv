import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamChat } from "../src/ai-router";
import type { AiProviderConfig } from "@noteriv/core";

describe("Universal AI Stream Router", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("routes Claude SDK requests to Claude driver", async () => {
    const claudeProvider: AiProviderConfig = {
      id: "claude-sdk",
      kind: "cli",
      name: "Claude Code Subscription",
      model: "claude-3-5-sonnet-latest",
    };

    const events: any[] = [];
    for await (const evt of streamChat({
      provider: claudeProvider,
      messages: [{ id: "1", role: "user", content: "Hello", createdAt: Date.now() }],
    })) {
      events.push(evt);
    }

    expect(events.length).toBeGreaterThan(0);
    // In test environment without relay, reports clear guidance
    expect(events[0].type).toBe("error");
    expect(events[0].message).toContain("Claude Code Subscription");
  });

  it("routes direct API requests to OpenAI-compatible stream", async () => {
    const sseLines = [
      'data: {"choices":[{"delta":{"content":"Pleased to meet you!"}}]}\n\n',
      'data: [DONE]\n\n',
    ].join("");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(sseLines, { headers: { "Content-Type": "text/event-stream" } })
      )
    );

    const openAiProvider: AiProviderConfig = {
      id: "openai-api",
      kind: "api",
      name: "OpenAI GPT-4o",
      model: "gpt-4o",
      apiKey: "sk-mock",
    };

    const events: any[] = [];
    for await (const evt of streamChat({
      provider: openAiProvider,
      messages: [{ id: "1", role: "user", content: "Hi", createdAt: Date.now() }],
    })) {
      events.push(evt);
    }

    const textDeltas = events.filter((e) => e.type === "text_delta").map((e) => e.text);
    expect(textDeltas.join("")).toBe("Pleased to meet you!");
    expect(events.some((e) => e.type === "done")).toBe(true);
  });
});
