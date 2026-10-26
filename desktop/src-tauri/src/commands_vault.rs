use crate::store::{self, AppConfig, CreateVaultInput, Vault};
use crate::watcher::WatcherState;
use crate::AppState;
use serde::Deserialize;
use serde_json::{Map, Value};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub async fn vault_get_config() -> AppConfig {
    store::get_config()
}

#[tauri::command]
pub async fn vault_is_setup_complete() -> bool {
    store::is_setup_complete()
}

#[tauri::command]
pub async fn vault_get_all() -> Vec<Vault> {
    store::get_vaults()
}

#[tauri::command]
pub async fn vault_get_active() -> Option<Vault> {
    store::get_active_vault()
}

#[tauri::command]
pub async fn vault_create(app: AppHandle, data: CreateVaultInput) -> Result<Vault, String> {
    let state: State<AppState> = app.state();
    let resolved = crate::paths::expand_tilde(&data.vault_path);
    if !state.scope.is_permitted_for_vault(&resolved) {
        log::warn!("[vault] refused vault_create outside permitted scope: {}", data.vault_path);
        return Err("Path is not permitted for vault creation. Please choose a folder using the dialog.".into());
    }
    let vault = store::create_vault(data);
    state.scope.grant(&vault.path);
    Ok(vault)
}

#[derive(Debug, Deserialize)]
pub struct UpdateVaultInput {
    pub id: String,
    pub updates: Value,
}

#[tauri::command]
pub async fn vault_update(args: UpdateVaultInput) -> Option<Vault> {
    store::update_vault(&args.id, &args.updates)
}

#[tauri::command]
pub async fn vault_delete(app: AppHandle, id: String) -> bool {
    let _ = crate::auth::remove_token(&id);
    let ok = store::delete_vault(&id);
    // Also restart watcher so we don't leave it pointing at a deleted vault.
    let state: State<AppState> = app.state();
    let lock_result = state.watcher.lock();
    if let Ok(mut w) = lock_result {
        match store::get_active_vault() {
            Some(active) => {
                let _ = w.start(&active.path, app.clone());
            }
            None => w.stop(),
        }
    }
    ok
}

#[tauri::command]
pub async fn vault_set_active(app: AppHandle, id: String) -> Option<Vault> {
    let v = store::set_active_vault(&id)?;
    let state: State<AppState> = app.state();
    let lock_result = state.watcher.lock();
    if let Ok(mut w) = lock_result {
        let _ = WatcherState::restart(&mut w, &v.path, app.clone());
    }
    Some(v)
}

#[tauri::command]
pub async fn settings_load() -> Map<String, Value> {
    store::load_settings()
}

#[tauri::command]
pub async fn settings_save(settings: Value) -> bool {
    store::save_settings(&settings)
}
