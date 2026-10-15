// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { markdownToHTML } from "../src/markdown-to-html";
import { registerCodeBlockProcessor, unregisterAllCodeBlockProcessorsForPlugin } from "../src/markdown-code-block-registry";

afterEach(() => unregisterAllCodeBlockProcessorsForPlugin("test-plugin"));

describe("block elements", () => {
  it("renders headings, paragraphs and soft line breaks", () => {
    expect(markdownToHTML("# Title\n\ntext\nmore")).toBe("<h1>Title</h1>\n<p>text<br>more</p>");
    expect(markdownToHTML("###### six")).toBe("<h6>six</h6>");
  });
  it("is empty for empty or blank input", () => {
    expect(markdownToHTML("")).toBe("");
    expect(markdownToHTML("\n  \n")).toBe("");
  });
  it("renders horizontal rules for ---, *** and ___", () => {
    for (const r of ["---", "***", "___", "-----  "]) expect(markdownToHTML(r), r).toBe("<hr>");
  });
  it("renders blockquotes as one quote with a paragraph", () => {
    expect(markdownToHTML("> a\n> b")).toBe("<blockquote><p>a<br>b</p></blockquote>");
  });
  it("renders fenced code (``` or ~~~) with an escaped language class and escaped content", () => {
    expect(markdownToHTML("```js\na < b && c\n```")).toBe('<pre><code class="language-js">a &lt; b &amp;&amp; c</code></pre>');
    expect(markdownToHTML("~~~\nx\n~~~")).toBe("<pre><code>x</code></pre>");
  });
  it("lets an unclosed fence swallow the rest of the document", () => {
    expect(markdownToHTML("```\ncode\n# not a heading")).toBe("<pre><code>code\n# not a heading</code></pre>");
  });
  it("turns dataview fences into a placeholder carrying the query", () => {
    expect(markdownToHTML('```dataview\nTABLE x FROM "a"\n```')).toBe('<div class="dataview-block" data-query="TABLE x FROM &quot;a&quot;"></div>');
  });
  it("renders [TOC] as a navigation block built from the document's headings", () => {
    const html = markdownToHTML("[TOC]\n# A\n## B");
    expect(html).toContain('<nav class="toc-block"');
    expect(html).toContain('href="#a"');
    expect(html).toContain('href="#b"');
  });
});

describe("lists", () => {
  it("renders unordered lists for -, * and +", () => {
    expect(markdownToHTML("- a\n* b\n+ c")).toBe("<ul>\n<li>a</li>\n<li>b</li>\n<li>c</li>\n</ul>");
  });
  it("renders task lists with disabled checkboxes", () => {
    const html = markdownToHTML("- [x] done\n- [ ] todo");
    expect(html).toContain('<li><input type="checkbox" checked disabled> done</li>');
    expect(html).toContain('<li><input type="checkbox"  disabled> todo</li>');
  });
  it("renders ordered lists", () => {
    expect(markdownToHTML("1. a\n2. b")).toBe("<ol>\n<li>a</li>\n<li>b</li>\n</ol>");
  });

  // Regression: "- " (a bullet the user has just typed) used to match the list branch but not the item
  // pattern, so the converter resumed at the same line forever. NOTE: if this ever regresses the test
  // run hangs rather than fails; CI jobs have a timeout for that reason.
  it("renders an empty list item instead of looping forever", () => {
    expect(markdownToHTML("- ")).toBe("<ul>\n<li></li>\n</ul>");
    expect(markdownToHTML("1. ")).toBe("<ol>\n<li></li>\n</ol>");
    expect(markdownToHTML("text\n- \nmore")).toBe("<p>text</p>\n<ul>\n<li></li>\n</ul>\n<p>more</p>");
    expect(markdownToHTML("- a\n- \n- b")).toBe("<ul>\n<li>a</li>\n<li></li>\n<li>b</li>\n</ul>");
  });
});

describe("tables", () => {
  it("renders header and body cells with the column alignment", () => {
    const html = markdownToHTML("| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |");
    expect(html).toContain('<th style="text-align:left">a</th>');
    expect(html).toContain('<th style="text-align:center">b</th>');
    expect(html).toContain('<td style="text-align:right">3</td>');
    expect(html.startsWith("<table>")).toBe(true);
  });
});

describe("inline formatting", () => {
  const p = (s: string) => markdownToHTML(s);
  it("handles code, bold, italic, bold-italic and strikethrough", () => {
    expect(p("`x`")).toBe("<p><code>x</code></p>");
    expect(p("**b** __b__")).toBe("<p><strong>b</strong> <strong>b</strong></p>");
    expect(p("*i* _i_")).toBe("<p><em>i</em> <em>i</em></p>");
    expect(p("***bi***")).toBe("<p><strong><em>bi</em></strong></p>");
    expect(p("~~gone~~")).toBe("<p><del>gone</del></p>");
  });
  it("does not italicise underscores inside words", () => {
    expect(p("snake_case_word")).toBe("<p>snake_case_word</p>");
  });
  it("escapes HTML written in the note", () => {
    expect(p('<b>x</b> & "q"')).toBe("<p>&lt;b&gt;x&lt;/b&gt; &amp; &quot;q&quot;</p>");
  });
  it("renders links and images, including one level of parentheses in the URL", () => {
    expect(p("[a](https://x.test)")).toBe('<p><a href="https://x.test">a</a></p>');
    expect(p("![alt](https://x.test/i.png)")).toBe('<p><img src="https://x.test/i.png" alt="alt"></p>');
    expect(p("[w](https://x.test/Foo_(bar))")).toContain('href="https://x.test/Foo_(bar)"');
  });
  it("renders drawing embeds", () => {
    expect(p("![[sketch.drawing]]")).toContain('class="drawing-embed" data-file="sketch.drawing"');
  });
  it("links bare URLs and emails, trimming trailing punctuation, without double-linking", () => {
    expect(p("see https://x.test/a.")).toBe('<p>see <a href="https://x.test/a">https://x.test/a</a>.</p>');
    expect(p("mail me@x.test now")).toBe('<p>mail <a href="mailto:me@x.test">me@x.test</a> now</p>');
    expect(p("[t](https://x.test)").match(/<a /g)).toHaveLength(1);
    expect(p("(https://x.test/Foo_(bar))")).toContain('<a href="https://x.test/Foo_(bar)">');
  });
  // Known gap, kept visible on purpose: unlike slide-utils this converter does not vet URL schemes, so a
  // javascript: link is emitted as written. Output that reaches a browser must be sanitised by the caller.
  it("does NOT filter javascript: URLs (callers must sanitise)", () => {
    expect(p("[x](javascript:alert(1))")).toContain('href="javascript:alert(1)"');
  });
});

describe("plugin code blocks", () => {
  it("renders a registered language through its processor", () => {
    registerCodeBlockProcessor("test-plugin", "boardx", (src, el) => {
      el.innerHTML = `<b>${src}</b>`;
    });
    expect(markdownToHTML("```boardx\nE4\n```")).toBe("<b>E4</b>");
  });
  it("reads the output before running the processor's cleanup", () => {
    registerCodeBlockProcessor("test-plugin", "boardx", (src, el) => {
      el.innerHTML = `<i>${src}</i>`;
      return () => {
        el.innerHTML = "";
      };
    });
    expect(markdownToHTML("```boardx\nD4\n```")).toBe("<i>D4</i>");
  });
  it("falls back to plain code when the processor throws or renders nothing", () => {
    registerCodeBlockProcessor("test-plugin", "boomx", () => {
      throw new Error("nope");
    });
    expect(markdownToHTML("```boomx\nx\n```")).toBe('<pre><code class="language-boomx">x</code></pre>');
    registerCodeBlockProcessor("test-plugin", "emptyx", () => {});
    expect(markdownToHTML("```emptyx\nx\n```")).toBe('<pre><code class="language-emptyx">x</code></pre>');
  });
  it("prefers a pre-rendered block over the registry", () => {
    registerCodeBlockProcessor("test-plugin", "boardx", (_s, el) => {
      el.innerHTML = "<u>live</u>";
    });
    const pre = new Map([["boardx\u0000E4", "<section>cached</section>"]]);
    expect(markdownToHTML("```boardx\nE4\n```", { preRendered: pre })).toBe("<section>cached</section>");
  });
  it("matches the fence language case-insensitively and ignores info after the first word", () => {
    registerCodeBlockProcessor("test-plugin", "boardx", (s, el) => {
      el.textContent = s;
    });
    expect(markdownToHTML("```BoardX theme=dark\nE4\n```")).toBe("E4");
  });
});
