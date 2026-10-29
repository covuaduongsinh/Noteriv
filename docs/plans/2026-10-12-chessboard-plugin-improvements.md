# Kế hoạch cải tiến: Chessboard Plugin

> **Cập nhật 2026-10-29:** plugin đã chuyển thành plugin lõi `packages/plugins/src/chessboard/` (TypeScript, tắt sẵn, chạy trên web/desktop/phone); bản ví dụ `desktop/examples/plugins/chessboard/` đã xóa. **Phase 1 (P1.1–P1.5) đã làm xong và có test** (`packages/plugins/test/chessboard.test.ts`; `squareToXY` trả `null` cho ô không hợp lệ thay vì `{x:0,y:0}`). Phase 2–4 còn lại; các đường dẫn `main.js` bên dưới là của bản cũ.
>
> **Cập nhật 2026-10-29 (2):** P1.4 (bắt buộc đúng một vua mỗi bên) **đã bỏ**: giáo án cờ vua cần thế cờ không vua hoặc một vua, và bàn cờ luôn phải hiện kể cả khi không có `strict: false` (strict vẫn bắt lỗi cấu trúc FEN). Đã làm thêm từ Phase 2/4: `labels: true` (nhãn a-h, 1-8, mặc định tắt), `size:` (100–600 px), `role="img"` + `aria-label` + `<title>`, làm mới bàn cờ đang mở khi lưu mặc định, bảng cú pháp trong tab cài đặt.
>
> **Plugin (bản cũ):** `desktop/examples/plugins/chessboard/`  
> **Phiên bản hiện tại:** 0.2.0  
> **Ngày lập kế hoạch:** 2026-10-12  
> **Nguồn:** Code review toàn diện bởi Antigravity

---

## Tóm tắt vấn đề

Plugin chessboard có kiến trúc ổn và license documentation xuất sắc, nhưng có **2 bug quan trọng** cần fix ngay và nhiều điểm cần cải thiện về UX, accessibility và khả năng mở rộng.

---

## Phase 1 — Bug Fixes (Ưu tiên cao)

**Mục tiêu:** Sửa tất cả lỗi ảnh hưởng trực tiếp đến người dùng.  
**Ước tính:** 1–2 ngày

### P1.1 — Fix marker ID xung đột (Critical)

**File:** `main.js` ~L282  
**Vấn đề:** Tất cả board cùng dùng `id="cb-arrowhead"`. Khi note có ≥2 block `chessboard`, trình duyệt chỉ nhận marker đầu tiên → mũi tên của các board sau bị màu sai.

```js
// Trước:
svg += '<defs><marker id="cb-arrowhead" ...>';
// marker-end="url(#cb-arrowhead)"

// Sau:
var markerId = "cb-arrowhead-" + Math.random().toString(36).slice(2, 9);
svg += '<defs><marker id="' + markerId + '" ...>';
// marker-end="url(#" + markerId + ")"
```

**Acceptance criteria:** Hai board có mũi tên màu khác nhau trên cùng note đều render đúng màu.

---

### P1.2 — Thêm error handling cho `saveSettings` (Critical)

**File:** `main.js` ~L381  
**Vấn đề:** `saveSettings` không có `.catch()` → lỗi im lặng, user nghĩ settings đã lưu nhưng thực ra không.

```js
// Trước:
api.app.saveSettings(currentSettings).then(function () {
  api.ui.showNotice("Chessboard defaults saved.", 4000);
});

// Sau:
api.app.saveSettings(currentSettings)
  .then(function () {
    api.ui.showNotice("Chessboard defaults saved.", 4000);
  })
  .catch(function (err) {
    api.ui.showNotice("Failed to save settings: " + String(err), 6000);
  });
```

---

### P1.3 — Normalize annotation square name về lowercase

**File:** `main.js` ~L254  
**Vấn đề:** Regex dùng `/i` nhưng `squareToXY` tính `charCodeAt(0) - 97` chỉ đúng với lowercase. Input `HA4` → file = `"A".charCodeAt(0) - 97 = -32` → vẽ ngoài canvas.

```js
// Sau khi match:
var squareName = hMatch[1].toLowerCase();
var hXY = squareToXY(squareName, config.orientation);
```

Tương tự cho arrow annotation (`aMatch[1]`, `aMatch[2]`).

---

### P1.4 — Thêm king count validation vào `validateFEN`

**File:** `main.js` ~L105 (sau vòng lặp ranks)  
**Vấn đề:** FEN với 0 vua hoặc 2 vua cùng màu vẫn pass validation, dẫn đến diagram sai.

```js
var pieces = parts[0].replace(/\//g, "");
var whiteKings = (pieces.match(/K/g) || []).length;
var blackKings = (pieces.match(/k/g) || []).length;
if (whiteKings !== 1) {
  return { valid: false, error: "Position must have exactly one white king (K)" };
}
if (blackKings !== 1) {
  return { valid: false, error: "Position must have exactly one black king (k)" };
}
```

---

### P1.5 — Guard `squareToXY` với input validation

**File:** `main.js` ~L120  
**Vấn đề:** Không check nếu `square` là `undefined`/`null` → TypeError uncaught.

```js
function squareToXY(square, orientation) {
  if (!square || square.length < 2) return { x: 0, y: 0 }; // safe fallback
  var file = square.charCodeAt(0) - 97;
  var rank = Number(square[1]) - 1;
  // ...
}
```

---

## Phase 2 — UX & Accessibility

**Mục tiêu:** Cải thiện trải nghiệm người dùng và hỗ trợ screen reader.  
**Ước tính:** 3–4 ngày

### P2.1 — Thêm rank/file labels (a–h, 1–8)

Render text labels quanh viền board. Hỗ trợ `orientation: black` (đảo nhãn).

```
┌─────────────────┐
│  a b c d e f g h│  ← file labels
│8 ♜ ♞ ♝ ♛ ...  8│  ← rank label hai bên
│7 ♟ ♟ ♟ ♟ ...  7│
│...              │
│1 ♖ ♘ ♗ ♕ ...  1│
│  a b c d e f g h│
└─────────────────┘
```

Thêm field `labels: true/false` (default `true`) vào parser.

---

### P2.2 — Accessibility: `role`, `aria-label`, `<title>`

```html
<!-- Thêm vào SVG root: -->
<svg role="img" aria-labelledby="cb-title-{id}" ...>
  <title id="cb-title-{id}">Chess diagram: {FEN}</title>
  ...
</svg>
```

---

### P2.3 — Settings UI: CSS class thay inline styles

Thay `style="font-size:13px"` bằng class `cb-settings-*` và inject một `<style>` tag khi plugin load. Giúp tự follow dark mode / theme của Noteriv nếu app dùng CSS variables.

---

### P2.4 — Live-update khi đổi settings mặc định

Hiện tại README ghi rõ: *"Reopen the note to see the new default."* — cần cải thiện.

Sau khi save settings, dispatch custom event để các board đang open tự re-render với settings mới.

---

### P2.5 — Hiển thị thông tin board dưới SVG

```html
<div class="chessboard-meta">
  <span>Position: Ke1, Qd1, ...</span>  <!-- piece count -->
  <span>White to move</span>             <!-- from FEN field 2 -->
</div>
```

Optional, có thể bật/tắt bằng field `showinfo: true`.

---

## Phase 3 — Architecture & Tests

**Mục tiêu:** Nâng chất lượng code cho vai trò "example plugin" chuẩn.  
**Ước tính:** 1 tuần

### P3.1 — Viết unit tests

Dùng Jest hoặc Vitest. Ưu tiên test:

| Test | Hàm |
|---|---|
| FEN hợp lệ pass validation | `validateFEN` |
| FEN thiếu rank reject | `validateFEN` |
| FEN không có king reject | `validateFEN` |
| Parse đủ các field | `parseChessboardBlock` |
| Orientation black đảo tọa độ | `squareToXY` |
| Annotation uppercase được normalize | `chessboardProcessor` |

---

### P3.2 — Reset `currentSettings` trong `onUnload`

```js
module.exports.onUnload = function () {
  currentSettings = { pieceSet: "classic", boardTheme: "classic" };
};
```

Tránh stale state khi plugin hot-reload trong môi trường dev.

---

### P3.3 — Unique board ID system

Thêm counter tăng dần per-plugin-load, gán cho mỗi board khi render:

```js
var _boardCounter = 0;

function chessboardProcessor(source, el) {
  var boardId = "cb-board-" + (++_boardCounter);
  // dùng boardId để namespace tất cả SVG IDs
}
```

Reset counter về 0 trong `onUnload`.

---

### P3.4 — Build step để tách piece SVG data

Tạo `build/` script ghép `pieces/classic.js` + `pieces/spatial.js` + `pieces/minimal.js` → `main.js`. Giữ DX tốt khi edit piece sets, output vẫn là 1 file duy nhất theo yêu cầu sandbox.

---

## Phase 4 — Feature Expansion

**Mục tiêu:** Tính năng nâng cao cho người dùng chess nghiêm túc.  
**Ước tính:** 2–3 tuần

### P4.1 — PGN support (move navigation)

```chessboard
pgn: 1.e4 e5 2.Nf3 Nc6 3.Bb5
move: 3
orientation: white
```

- Parse PGN → danh sách FEN (dùng thư viện nhỏ hoặc tự implement)
- Render board tại move được chỉ định
- Thêm nút Prev / Next (optional, nếu Noteriv API hỗ trợ interactive widget)

---

### P4.2 — Custom board size

```chessboard
fen: ...
size: 280
```

Thay `max-width:360px` bằng giá trị từ config. Range hợp lệ: 100–600px.

---

### P4.3 — Export board

Context menu hoặc button "Copy SVG" / "Download PNG" trên hover board widget. Yêu cầu kiểm tra Noteriv API hỗ trợ context menu plugin.

---

### P4.4 — Thêm piece sets mới

| ID | Tên | Nguồn |
|---|---|---|
| `merida` | Merida | lichess open-source |
| `alpha` | Alpha | lichess open-source |
| `cburnett` | Cburnett | lichess open-source (CC BY-SA) |

Cần kiểm tra license trước khi thêm vào `THIRD-PARTY-LICENSES.md`.

---

### P4.5 — Text annotation trên ô

```chessboard
annotations: He4/g, Ce4/+, Ce5/!
```

`C<square>/<text>` — vẽ text nhỏ (ký tự đơn hoặc 2 ký tự) vào trong ô, hữu ích để đánh dấu điểm mạnh/yếu của vị trí.

---

## Checklist trước khi merge

- [ ] Hai `chessboard` blocks trên cùng note → tất cả mũi tên đúng màu
- [ ] `strict: false` + FEN sai → vẫn render (hoặc fallback đẹp)
- [ ] Settings save lỗi → hiển thị error notice rõ ràng
- [ ] SVG output không có duplicate IDs
- [ ] Plugin load trên Noteriv < 1.3.0 → notice thân thiện, không crash
- [ ] Annotation uppercase (`HA4`, `Ae2-E4`) → xử lý đúng
- [ ] FEN không có king → validation error rõ ràng
- [ ] Unit tests pass (Phase 3+)

---

## Liên kết liên quan

- Plugin source: [`desktop/examples/plugins/chessboard/main.js`](../../../desktop/examples/plugins/chessboard/main.js)
- Plugin API docs: [`docs/plugins/creating-plugins.md`](../plugins/creating-plugins.md)
- License: [`desktop/examples/plugins/chessboard/THIRD-PARTY-LICENSES.md`](../../../desktop/examples/plugins/chessboard/THIRD-PARTY-LICENSES.md)
