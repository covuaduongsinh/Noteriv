# Phiên K-B2: Vá bảo mật desktop và phone (lỗi #7)

> Ngày: 2026-10-26 · Chặng: [K](2026-10-20-chang-k-kiem-chung.md), mục "sửa lỗi Chặn/Nặng" · Nhánh: `covuaduongsinh/k-b2-desktop-phone`
> Nguồn: Rà soát bảo mật Chặng K (mục 2 của [moi-mat.md](../kiem-chung/moi-mat.md)), lỗi #7 trong [loi-va-gop-y.md](../kiem-chung/loi-va-gop-y.md).

## Mục tiêu

Vá các vấn đề bảo mật mức Cao/Trung bình trên Desktop và Phone:
1. **H2 (Desktop): WebDAV sync path traversal.** Server WebDAV độc hoặc bị chiếm có thể trả `href` chứa `..` để ghi file tuỳ ý ra ngoài thư mục vault khi sync kéo về.
   - *Cách sửa:* Xác thực đường dẫn tương đối (`rel`) không chứa `..`, không chứa component đặc biệt (`ParentDir`, `CurDir`, `RootDir`, `Prefix`), và kiểm tra `scope.is_allowed(&dest)` trước khi ghi ra đĩa. Kiểm tra scope của `vault_path` trong `sync_run`.
2. **H3 (Desktop): Renderer bỏ qua scope hệ thống file.**
   - `vault_create`: chỉ cho phép tạo/đăng ký vault khi đường dẫn đã được người dùng chọn qua dialog (`scope.readable` / `scope.openable`) hoặc nằm trong thư mục mặc định của Noteriv (`~/Noteriv/<name>`). Không cho phép đăng ký thư mục gốc hệ thống hoặc home (`~`) làm vault.
   - `vault_update`: không cho phép sửa trường `path` của vault đã tồn tại.
   - `git_*`: tất cả các lệnh Git trong Tauri (`git_is_repo`, `git_init`, `git_set_remote`, `git_status`, `git_sync`, `git_pull`, `git_fetch`, `git_log`, `git_clone`, `git_file_log`, `git_show_file`) phải kiểm tra `scope.is_allowed(&dir)`. Thêm `--` trước đối số vị trí (branch, ref, URL, file path) và xác thực URL / branch không bắt đầu bằng `-`.
3. **M3 (Phone): Bảo vệ token và chống sao lưu tự động.**
   - Token GitHub và Git được chuyển sang lưu trữ an toàn bằng `expo-secure-store` (mã hoá bằng Keystore/Keychain), tự động migrate từ `AsyncStorage`.
   - `app.json`: đặt `android.allowBackup: false` để ngăn trích xuất dữ liệu qua `adb backup`.

## Kế hoạch triển khai

1. **Desktop Rust:**
   - `desktop/src-tauri/src/commands_sync.rs`:
     - Thêm `is_safe_rel_path`: từ chối mọi `rel` chứa `..`, separators, prefixes, dot components.
     - Kiểm tra `scope.is_allowed` trước khi ghi file từ WebDAV và trong `sync_run`.
   - `desktop/src-tauri/src/scope.rs`:
     - Thêm phương thức kiểm tra quyền tạo vault: `is_permitted_for_vault_creation(path)`.
   - `desktop/src-tauri/src/store.rs` & `desktop/src-tauri/src/commands_vault.rs`:
     - `vault_create`: kiểm tra `scope.is_permitted_for_vault_creation(&resolved)`.
     - `update_vault`: bỏ qua / chặn thay đổi `path` và `id`.
   - `desktop/src-tauri/src/commands_git.rs`:
     - Xác thực URL (chỉ nhận https, không chứa cờ git) và branch (`is_safe_branch`).
     - Kiểm tra `scope.is_allowed` cho mọi lệnh git.
     - Thêm `--` trước các đối số vị trí trong `run_git`.
2. **Phone:**
   - Cài đặt `expo-secure-store`.
   - `phone/lib/storage.ts`: tích hợp `expo-secure-store` cho `KEYS.GITHUB_TOKEN` và `KEYS.GIT_TOKEN`, kèm fallback và migration.
   - `phone/app.json`: cấu hình `"allowBackup": false` trong mục `"android"`.
3. **Kiểm thử và xác minh:**
   - `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
   - Review mã độc lập.
   - Mở PR cho K-B2 và hỏi chủ dự án trước khi merge.


## Kết quả triển khai và Review

### 1. Đã triển khai
- **WebDAV / Folder Sync Path Traversal (H2)**:
  - `is_safe_sync_rel_path`: từ chối mọi component chứa `..`, `.`, root, prefix, backslash, null bytes.
  - Kiểm tra `scope.is_allowed(&dest)` trước khi ghi ra đĩa khi pull WebDAV / Folder sync.
  - Kiểm tra `scope.is_allowed` cho `vault_path` và `target_path` trong `sync_run` và `sync_test`.
  - Giữ lại cổng khi tính `server_root` trong WebDAV.
- **Scope Vault & Git (H3)**:
  - `scope.is_permitted_for_vault`: chỉ cho phép đường dẫn chọn qua dialog hoặc thư mục con trong `~/Noteriv/<name>`. Từ chối thư mục gốc hệ thống và thư mục home `~`.
  - `vault_create`: kiểm tra `scope.is_permitted_for_vault(&resolved)`.
  - `update_vault`: bỏ qua / chặn sửa đổi trường `path` và `id`.
  - `commands_git.rs`:
    - `is_safe_branch`: kiểm tra quy tắc ref chặt chẽ (chặn `-`, `..`, `.git`, khoảng trắng, ký tự điều khiển).
    - `is_safe_remote_url`: chỉ nhận `https://`, chặn `git@` và URL bắt đầu bằng `-` để ngăn SSH option injection (CVE-2017-1000117).
    - Kiểm tra `scope.is_allowed` cho mọi lệnh git.
    - `git_file_log` và `git_show_file` xử lý chuẩn xác đường dẫn ghi chú tương đối (`p.join(fp)`).
    - Đặt `--` trước các đối số vị trí trong `push`, `fetch`, `merge`, `log`, `clone`, `show`.
- **Phone (M3)**:
  - Thêm `expo-secure-store: ~15.0.8` vào `phone/package.json`.
  - `phone/lib/storage.ts`: token GitHub/Git được lưu vào `SecureStore` (mã hoá Keystore/Keychain) với tên khoá tương thích Android (`toSecureKey`). Tự động di chuyển (migrate) và xoá token cũ trong `AsyncStorage`.
  - `phone/app.json`: đặt `"allowBackup": false` dưới mục `"android"`.

### 2. Đánh giá độc lập (Review)
- Subagent `code-reviewer` đã rà soát toàn bộ diff và phê duyệt sau khi đã áp dụng các sửa đổi:
  - Khắc phục kiểm tra scope đường dẫn tương đối trong `git_file_log_impl`.
  - Hạn chế remote URL sang HTTPS-only để triệt tiêu nguy cơ SSH option injection.
  - Bổ sung kiểm tra branch ref cho `git_sync_impl`.
  - Bổ sung kiểm tra scope cho `target_path` trong folder sync và `sync_test`.
  - Chặn triệt để thư mục home trong `is_permitted_for_vault`.

### 3. Kiểm thử
- `cargo test --manifest-path desktop/src-tauri/Cargo.toml`: **32/32 tests PASS** (gồm các test mới cho `is_safe_sync_rel_path`, propfind traversal filter, branch rules, remote url rules, git scope checks, và vault registration scope checks).
- `npm run typecheck`: **PASS** không có lỗi trên toàn bộ các workspace (`core`, `plugin-api`, `plugins`, `ui`, `web`, `desktop`).
- `npm test`: **691/691 tests PASS** (35 test files trong `@noteriv/core`, 27 files trong `@noteriv/ui`, 13 files trong `@noteriv/plugins`).
