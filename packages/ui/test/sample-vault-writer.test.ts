import { describe, expect, it } from "vitest";
// The desktop setup wizard writes the "Getting started" notes (stage 4, session 4.6).
import { writeSampleVault } from "../../../desktop/src/lib/sample-vault";
import { sampleVault } from "../../core/src/sample-vault";

function recorder() {
  const calls: string[] = [];
  return {
    calls,
    fs: {
      createDir: async (dir: string) => void calls.push(`dir ${dir}`),
      writeFile: async (file: string, content: string) => void calls.push(`file ${file} (${content.length})`),
    },
  };
}

describe("writeSampleVault", () => {
  it("creates each sub-folder once, before the files in it", async () => {
    const { calls, fs } = recorder();
    await writeSampleVault("C:\\Users\\me\\Noteriv\\Personal\\", [
      { path: "Welcome.md", content: "a" },
      { path: "Templates/Daily.md", content: "bb" },
      { path: "Templates/Weekly.md", content: "ccc" },
      { path: "Projects/2026/Plan.md", content: "" },
    ], fs);
    expect(calls).toEqual([
      "file C:\\Users\\me\\Noteriv\\Personal/Welcome.md (1)",
      "dir C:\\Users\\me\\Noteriv\\Personal/Templates",
      "file C:\\Users\\me\\Noteriv\\Personal/Templates/Daily.md (2)",
      "file C:\\Users\\me\\Noteriv\\Personal/Templates/Weekly.md (3)",
      "dir C:\\Users\\me\\Noteriv\\Personal/Projects",
      "dir C:\\Users\\me\\Noteriv\\Personal/Projects/2026",
      "file C:\\Users\\me\\Noteriv\\Personal/Projects/2026/Plan.md (0)",
    ]);
  });

  it("writes every note of the sample vault", async () => {
    const { calls, fs } = recorder();
    const { files } = sampleVault("vi");
    await writeSampleVault("/home/me/Noteriv/Cá nhân", files, fs);
    expect(calls.filter((c) => c.startsWith("file "))).toHaveLength(files.length);
    expect(calls).toContain("file /home/me/Noteriv/Cá nhân/Chào mừng.md (" + files[0].content.length + ")");
  });
});
