# Phiên sửa Lỗi #5: Đọc note hàng loạt cho plugin (Batch note reading)

Ngày: 2026-10-26
Nhánh: `covuaduongsinh/k-loi-5-doc-note-hang-loat`
Mục tiêu: Khắc phục Lỗi #5 (Nặng) trong `docs/kiem-chung/loi-va-gop-y.md`: Các plugin (Graph, Vault insights, Dataview, Flashcards, Calendar) dùng `scanVault` đọc từng note bằng 1 request riêng lẻ (8 request song song), dẫn đến hàng nghìn request trên các vault lớn và chạm rate limit 300 request/phút ở production (gây lỗi 429 và sập plugin).

---

## Giải pháp thiết kế

1. **Server Endpoint**:
   - Thêm `POST /api/v1/vaults/:vid/notes/batch` trong `web/server/src/routes/notes.ts`.
   - Hỗ trợ:
     - `all: true`: Trả về toàn bộ danh sách note đang hoạt động (không bị xoá) kèm `path` và `content` trong 1 request duy nhất.
     - `paths: string[]`: Trả về các note theo danh sách đường dẫn (tối đa 250).
     - `noteIds: string[]`: Trả về các note theo danh sách ID (tối đa 250).
   - Kiểm tra `assertVaultAccess`.

2. **Web API Client**:
   - Thêm `webApi.notes.batch(vaultId, { noteIds?, paths?, all? })` trong `web/src/lib/webApi.ts`.

3. **Core Seam (`VaultAdapter`)**:
   - Thêm phương thức tuỳ chọn `readBatchNotes?(options?: { ids?: string[]; paths?: string[]; all?: boolean }): Promise<{ ref: NoteRef; content: string }[]>` vào `VaultAdapter` trong `packages/core/src/vault-adapter.ts`.
   - Cài đặt cho:
     - `webVaultAdapter` (`web/src/lib/webVaultAdapter.ts`): gọi `webApi.notes.batch`.
     - `MemoryVaultAdapter` (`packages/core/src/memory-vault-adapter.ts`): đọc từ in-memory map.
     - `desktopVaultAdapter` (`desktop/src/lib/desktopVaultAdapter.ts`): đọc nhanh bằng `Promise.all` từ đĩa cục bộ.

4. **Plugin API & Host**:
   - `VaultApi` trong `packages/plugin-api/src/index.ts`: Bổ sung `readBatch?(paths: string[]): Promise<Record<string, string>>` và `readAll?(): Promise<{ path: string; content: string }[]>`.
   - `core-plugin-host.ts` (`packages/ui/src/plugins/core-plugin-host.ts`): Cài đặt `readBatch` và `readAll` uỷ quyền cho `adapter.readBatchNotes`.

5. **`scanVault` Optimization**:
   - Cập nhật `packages/plugins/src/shared/vault.ts`:
     - Nếu `vault.readAll` có sẵn: gọi trực tiếp `vault.readAll()`.
     - Nếu `vault.readBatch` có sẵn: gọi `vault.readBatch(paths)`.
     - Fallback: giữ vòng lặp `vault.read` theo lô concurrency = 8 cho các adapter cũ.

6. **Kiểm thử & Benchmark**:
   - Bổ sung unit test cho `readBatchNotes` trong `memory-vault-adapter.test.ts`.
   - Bổ sung unit test cho `scanVault` sử dụng `readAll` và `readBatch` trong `packages/plugins/test/`.
   - Kiểm tra API server bằng test trong `web/server`.
   - Chạy `npm test` và `npm run typecheck`.
