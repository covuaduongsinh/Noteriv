"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { webApi } from "@/lib/webApi";

type TokenRow = Awaited<ReturnType<typeof webApi.clipper.list>>[number];

/** Builds the bookmarklet: sends the selection (or the main article) to this server with the clip token. */
function bookmarkletFor(origin: string, token: string): string {
  const code = `(function(){try{var s=window.getSelection(),h="";if(s&&s.rangeCount&&!s.isCollapsed){var d=document.createElement("div");d.appendChild(s.getRangeAt(0).cloneContents());h=d.innerHTML}else{var a=document.querySelector("article,main")||document.body;h=a.innerHTML.slice(0,1400000)}fetch(${JSON.stringify(
    origin + "/api/v1/clip"
  )},{method:"POST",headers:{"Content-Type":"application/json",Authorization:${JSON.stringify(
    "Bearer " + token
  )}},body:JSON.stringify({title:document.title,url:location.href,html:h})}).then(function(r){alert(r.ok?"Đã lưu vào Noteriv":"Noteriv: lỗi "+r.status)}).catch(function(){alert("Không gửi được tới Noteriv (trang này có thể chặn kết nối ngoài)")})}catch(e){alert("Noteriv clipper: "+e.message)}})();`;
  return "javascript:" + encodeURIComponent(code);
}

/**
 * Settings > Clipper. Web counterpart of desktop's local clipper (127.0.0.1:27123): a
 * bookmarklet that posts the current selection/article to this server. The token it
 * embeds can only create notes in one vault (see server routes/clipper.ts).
 */
export default function ClipperSection({ vaultId, vaultName }: { vaultId: string; vaultName: string }) {
  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [name, setName] = useState("Trình duyệt của tôi");
  const [fresh, setFresh] = useState<{ token: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [armed, setArmed] = useState<string | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const refresh = useCallback(() => {
    webApi.clipper.list().then(setTokens).catch(() => setTokens([]));
  }, []);
  useEffect(refresh, [refresh]);

  // React refuses javascript: hrefs, so the bookmarklet link is set on the DOM node directly.
  useEffect(() => {
    if (fresh && linkRef.current) linkRef.current.setAttribute("href", bookmarkletFor(window.location.origin, fresh.token));
  }, [fresh]);

  async function create() {
    setBusy(true);
    setError("");
    try {
      const t = await webApi.clipper.create(name.trim() || "Trình duyệt", vaultId);
      setFresh({ token: t.token, name: t.name });
      refresh();
    } catch {
      setError("Không tạo được token (tối đa 20 token, và cần quyền ghi vault).");
    } finally {
      setBusy(false);
    }
  }

  function revoke(id: string) {
    if (armed !== id) {
      setArmed(id);
      setTimeout(() => setArmed((a) => (a === id ? null : a)), 4000);
      return;
    }
    setArmed(null);
    webApi.clipper.revoke(id).then(refresh).catch(() => setError("Không thu hồi được token."));
  }

  return (
    <div className="st-section">
      <div className="st-row-desc" style={{ marginBottom: 10 }}>
        Lưu nhanh trang web đang xem vào vault <b>{vaultName}</b> (thư mục <code>Clippings/</code>). Bôi đen đoạn cần lưu rồi bấm
        bookmarklet; không bôi đen thì lưu nội dung chính của trang.
      </div>

      <Row2 label="Tạo bookmarklet mới" desc="Mỗi trình duyệt/thiết bị nên có một token riêng để thu hồi được.">
        <div style={{ display: "flex", gap: 6 }}>
          <input className="st-text-input" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="st-test-btn" disabled={busy} onClick={create}>
            {busy ? "Đang tạo…" : "Tạo"}
          </button>
        </div>
      </Row2>
      {error && <div className="st-test-result st-test-fail">{error}</div>}

      {fresh && (
        <div style={{ background: "var(--bg-tertiary)", borderRadius: 8, padding: 12, margin: "8px 0" }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>“{fresh.name}” đã sẵn sàng</div>
          <div className="st-row-desc" style={{ margin: "6px 0" }}>
            Kéo nút dưới đây lên thanh bookmark của trình duyệt (hoặc chuột phải → Add to bookmarks). Token chỉ hiện ở đây một lần;
            bookmarklet chứa token nên đừng chia sẻ nó.
          </div>
          <a
            ref={linkRef}
            draggable
            className="st-test-btn"
            style={{ display: "inline-block", cursor: "grab" }}
            onClick={(e) => e.preventDefault()}
          >
            📎 Clip to Noteriv
          </a>
          <div className="st-row-desc" style={{ marginTop: 8 }}>
            Một số trang (CSP nghiêm ngặt) chặn bookmarklet gửi dữ liệu ra ngoài; khi đó bạn sẽ thấy thông báo lỗi kết nối.
          </div>
        </div>
      )}

      <div className="st-divider" />
      <div className="st-group-label">Token đang hoạt động</div>
      {tokens === null && <div className="st-row-desc">Đang tải…</div>}
      {tokens?.length === 0 && <div className="st-row-desc">Chưa có token nào.</div>}
      {tokens?.map((t) => (
        <div key={t.id} className="st-row">
          <div className="st-row-info">
            <span className="st-row-label">
              {t.name} <span style={{ opacity: 0.6 }}>…{t.tokenHint}</span>
            </span>
            <span className="st-row-desc">
              Vault: {t.vaultName} · {t.lastUsedAt ? `dùng lần cuối ${new Date(t.lastUsedAt).toLocaleString()}` : "chưa dùng"}
            </span>
          </div>
          <div className="st-row-control">
            <button className="st-test-btn" onClick={() => revoke(t.id)}>
              {armed === t.id ? "Bấm lần nữa để thu hồi" : "Thu hồi"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Row2({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="st-row">
      <div className="st-row-info">
        <span className="st-row-label">{label}</span>
        <span className="st-row-desc">{desc}</span>
      </div>
      <div className="st-row-control">{children}</div>
    </div>
  );
}
