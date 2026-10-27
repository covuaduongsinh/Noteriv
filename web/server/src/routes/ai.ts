import type { FastifyInstance } from "fastify";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export default async function aiRoutes(fastify: FastifyInstance) {
  fastify.post("/claude-stream", async (request, reply) => {
    const body = (request.body || {}) as any;
    const { messages = [], systemPrompt = "", model, reasoningEffort } = body;

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const userPrompt = lastUserMsg?.content || "Xin chào";

    const baseInstruction =
      systemPrompt ||
      "Bạn là trợ lý Noteriv AI thông minh cho sổ tay ghi chú Markdown (Vault). Bạn nắm toàn diện cấu trúc Vault thông qua thẻ <vault_overview> trong <context> (gồm tên vault, tổng số ghi chú, danh sách các thư mục, và toàn bộ file trong vault). Khi người dùng hỏi về số lượng file, danh sách thư mục, hoặc tìm ghi chú, hãy sử dụng thông tin trong <vault_overview> để trả lời chính xác, đầy đủ và thân thiện bằng tiếng Việt. Không trả lời rằng bạn thiếu công cụ đếm file vì toàn bộ danh sách đã có trong <vault_overview>.";

    const prompt = `[HƯỚNG DẪN HỆ THỐNG]:\n${baseInstruction}\n\n[CÂU HỎI NGƯỜI DÙNG]:\n${userPrompt}`;

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("Access-Control-Allow-Origin", "*");
    reply.raw.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (typeof (reply.raw as any).flushHeaders === "function") {
      (reply.raw as any).flushHeaders();
    }

    const args = ["-p", "--output-format", "stream-json", "--verbose"];
    if (model && model !== "default") {
      args.push("--model", model);
    }
    if (reasoningEffort && reasoningEffort !== "none") {
      const effortMap: Record<string, string> = {
        low: "low",
        medium: "medium",
        high: "high",
        max: "max",
      };
      args.push("--effort", effortMap[reasoningEffort] || "medium");
    }

    // Spawn claude CLI with stdin piping to avoid Windows shell argument truncation
    const child = spawn(
      "claude.exe",
      args,
      {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: process.env.TEMP || "C:\\",
        shell: process.platform === "win32",
      }
    );

    // Pipe the full prompt safely via stdin
    child.stdin.write(prompt);
    child.stdin.end();

    let lastDeliveredText = "";
    let buffer = "";

    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("{")) continue;

        try {
          const event = JSON.parse(trimmed);
          if (event.type === "assistant" && event.message?.content) {
            for (const part of event.message.content) {
              if (part.type === "text" && typeof part.text === "string") {
                const fullText = part.text;
                if (fullText.length > lastDeliveredText.length && fullText.startsWith(lastDeliveredText)) {
                  const delta = fullText.slice(lastDeliveredText.length);
                  lastDeliveredText = fullText;
                  reply.raw.write(`data: ${JSON.stringify({ type: "text_delta", text: delta })}\n\n`);
                } else if (fullText !== lastDeliveredText && fullText.length > 0) {
                  const delta = fullText.startsWith(lastDeliveredText)
                    ? fullText.slice(lastDeliveredText.length)
                    : fullText;
                  lastDeliveredText = fullText;
                  reply.raw.write(`data: ${JSON.stringify({ type: "text_delta", text: delta })}\n\n`);
                }
              }
            }
          } else if (event.type === "result" && event.result) {
            if (typeof event.result === "string" && event.result.length > lastDeliveredText.length) {
              const delta = event.result.slice(lastDeliveredText.length);
              lastDeliveredText = event.result;
              reply.raw.write(`data: ${JSON.stringify({ type: "text_delta", text: delta })}\n\n`);
            }
          }
        } catch {
          // ignore partial JSON
        }
      }
    });

    child.on("close", (code) => {
      if (code !== 0 && lastDeliveredText.length === 0) {
        reply.raw.write(
          `data: ${JSON.stringify({
            type: "error",
            message: `Claude Code exited with code ${code}`,
          })}\n\n`
        );
      } else {
        reply.raw.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        reply.raw.write("data: [DONE]\n\n");
      }
      reply.raw.end();
    });

    child.on("error", (err) => {
      reply.raw.write(
        `data: ${JSON.stringify({
          type: "error",
          message: `Failed to spawn Claude CLI: ${err.message}`,
        })}\n\n`
      );
      reply.raw.end();
    });
  });

  fastify.post("/antigravity-stream", async (request, reply) => {
    const body = (request.body || {}) as any;
    const { messages = [], systemPrompt = "", model, reasoningEffort } = body;

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const userPrompt = lastUserMsg?.content || "Xin chào";

    const baseInstruction =
      systemPrompt ||
      "Bạn là trợ lý Noteriv AI thông minh cho sổ tay ghi chú Markdown (Vault). Bạn nắm toàn diện cấu trúc Vault thông qua thẻ <vault_overview> trong <context> (gồm tên vault, tổng số ghi chú, danh sách các thư mục, và toàn bộ file trong vault). Khi người dùng hỏi về số lượng file, danh sách thư mục, hoặc tìm ghi chú, hãy sử dụng thông tin trong <vault_overview> để trả lời chính xác, đầy đủ và thân thiện bằng tiếng Việt. Không trả lời rằng bạn thiếu công cụ đếm file vì toàn bộ danh sách đã có trong <vault_overview>.";

    const prompt = `[HƯỚNG DẪN HỆ THỐNG]:\n${baseInstruction}\n\n[CÂU HỎI NGƯỜI DÙNG]:\n${userPrompt}`;

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("Access-Control-Allow-Origin", "*");
    reply.raw.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (typeof (reply.raw as any).flushHeaders === "function") {
      (reply.raw as any).flushHeaders();
    }

    const defaultAgyPath = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "agy", "bin", "agy.EXE")
      : "agy.exe";
    const agyBin = fs.existsSync(defaultAgyPath) ? defaultAgyPath : "agy.exe";

    const validAgyModels = [
      "gemini-3.8-flash-high",
      "gemini-3.8-flash-medium",
      "gemini-3.8-flash-low",
      "gemini-4-argon-high",
      "gemini-4-argon-medium",
      "gemini-4-argon-low",
      "claude-sonnet-5-5-high",
      "claude-sonnet-5-5-medium",
      "claude-sonnet-5-5-low",
      "claude-opus-5-5-high",
      "claude-opus-5-5-medium",
      "claude-opus-5-5-low",
      "gpt-oss-120b-medium",
    ];

    const targetModel = model && validAgyModels.includes(model) ? model : "gemini-3.8-flash-high";
    const args = ["--input-format", "text", "--output-format", "stream-json", "--model", targetModel];

    if (reasoningEffort && reasoningEffort !== "none") {
      const effortMap: Record<string, string> = {
        low: "low",
        medium: "medium",
        high: "high",
        max: "max",
      };
      args.push("--effort", effortMap[reasoningEffort] || "medium");
    }

    const child = spawn(agyBin, args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: process.env.TEMP || "C:\\",
      shell: process.platform === "win32",
    });

    // Pipe prompt safely via stdin to prevent Windows cmd.exe argument corruption
    child.stdin.write(prompt);
    child.stdin.end();

    let buffer = "";
    let stderrBuffer = "";
    let lastDeliveredText = "";
    let lastErrorMessage = "";

    child.stderr?.on("data", (chunk: Buffer) => {
      stderrBuffer += chunk.toString();
    });

    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("{")) continue;

        try {
          const event = JSON.parse(trimmed);
          if (event.event === "step_update" && event.step_update) {
            const update = event.step_update;
            if (update.text_delta) {
              lastDeliveredText += update.text_delta;
              reply.raw.write(`data: ${JSON.stringify({ type: "text_delta", text: update.text_delta })}\n\n`);
            }
            if (update.usage) {
              reply.raw.write(
                `data: ${JSON.stringify({
                  type: "usage",
                  inputTokens: update.usage.input_tokens || 0,
                  outputTokens: update.usage.output_tokens || 0,
                })}\n\n`
              );
            }
          } else if (event.event === "result" && event.result) {
            if (event.result.status === "ERROR") {
              lastErrorMessage = event.result.error || "Antigravity CLI execution error";
            }
            if (event.result.usage) {
              reply.raw.write(
                `data: ${JSON.stringify({
                  type: "usage",
                  inputTokens: event.result.usage.input_tokens || 0,
                  outputTokens: event.result.usage.output_tokens || 0,
                })}\n\n`
              );
            }
          }
        } catch {
          // ignore partial JSON
        }
      }
    });

    child.on("close", (code) => {
      if (code !== 0 && lastDeliveredText.length === 0) {
        const errMsg = lastErrorMessage || stderrBuffer.trim() || `Antigravity CLI exited with code ${code}`;
        reply.raw.write(
          `data: ${JSON.stringify({
            type: "error",
            message: errMsg,
          })}\n\n`
        );
      } else {
        reply.raw.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        reply.raw.write("data: [DONE]\n\n");
      }
      reply.raw.end();
    });

    child.on("error", (err) => {
      reply.raw.write(
        `data: ${JSON.stringify({
          type: "error",
          message: `Failed to spawn Antigravity CLI: ${err.message}`,
        })}\n\n`
      );
      reply.raw.end();
    });
  });
}
