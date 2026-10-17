import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { flattenMessages, isPluralForms, placeholders, type CatalogEntry, type Messages } from "../src/i18n/translate";

// The English catalog is the reference: every other catalog must translate every key, with the same placeholders,
// and every key the code asks for by name must exist. These checks keep a missing or misspelt key from reaching a
// screen (where it would show up as the raw key).

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const localesDir = join(root, "packages", "ui", "src", "i18n", "locales");

const load = (locale: string) => flattenMessages(JSON.parse(readFileSync(join(localesDir, `${locale}.json`), "utf8")) as Messages);
const en = load("en");
const others = readdirSync(localesDir)
  .filter((f) => f.endsWith(".json") && f !== "en.json")
  .map((f) => [f.replace(/\.json$/, ""), load(f.replace(/\.json$/, ""))] as const);

/**
 * English keys a catalog may still lack while strings are being moved into the catalogs (Stage 4, sessions 4.2–4.3).
 * Must be empty when 4.3 is done.
 */
const NOT_YET_TRANSLATED: Record<string, string[]> = { vi: [] };

const texts = (entry: CatalogEntry) => (typeof entry === "string" ? [entry] : Object.values(entry));
const names = (entry: CatalogEntry) => new Set(texts(entry).flatMap(placeholders).filter((n) => n !== "count"));

describe("i18n catalogs", () => {
  it("has at least one catalog besides English", () => {
    expect(others.map(([l]) => l)).toContain("vi");
  });

  for (const [locale, catalog] of others) {
    it(`${locale}: has no key English lacks`, () => {
      expect([...catalog.keys()].filter((k) => !en.has(k))).toEqual([]);
    });

    it(`${locale}: translates every English key`, () => {
      const allowed = new Set(NOT_YET_TRANSLATED[locale] ?? []);
      expect([...en.keys()].filter((k) => !catalog.has(k) && !allowed.has(k))).toEqual([]);
    });

    it(`${locale}: keeps the placeholders and the plural shape of English`, () => {
      const offenders: string[] = [];
      for (const [key, entry] of catalog) {
        const ref = en.get(key);
        if (!ref) continue;
        if (isPluralForms(ref) !== isPluralForms(entry)) offenders.push(`${key}: plural in one catalog only`);
        const want = [...names(ref)].sort().join(",");
        const got = [...names(entry)].sort().join(",");
        if (want !== got) offenders.push(`${key}: {${got}} instead of {${want}}`);
      }
      expect(offenders).toEqual([]);
    });
  }

  it("has every key the code names", () => {
    const dirs = ["packages/ui/src", "packages/plugins/src", "web/src", "desktop/src"].map((d) => join(root, d));
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) return entry === "node_modules" ? [] : files(full);
        return /\.(ts|tsx)$/.test(entry) ? [full] : [];
      });
    // `t("a.b")`, `i18n.t("a.b")`: literal dotted keys starting with one of the catalog's top-level groups.
    const groups = new Set([...en.keys()].map((k) => k.split(".")[0]));
    const re = /\bt\(\s*["'`]([a-zA-Z][\w-]*(?:\.[\w-]+)+)["'`]/g;
    const missing: string[] = [];
    let used = 0;
    for (const f of dirs.flatMap(files)) {
      for (const m of readFileSync(f, "utf8").matchAll(re)) {
        if (!groups.has(m[1].split(".")[0])) continue;
        used++;
        if (!en.has(m[1])) missing.push(`${relative(root, f)}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
    expect(used).toBeGreaterThan(0);
  });
});
