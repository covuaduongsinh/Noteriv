"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { VaultChevronIcon, PlusIcon } from "@/components/icons";
import { webApi, type ApiVault } from "@/lib/webApi";

interface VaultSwitcherProps {
  vaults: ApiVault[];
  activeVault: ApiVault | null;
}

export default function VaultSwitcher({ vaults, activeVault }: VaultSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newVaultName, setNewVaultName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const displayName = activeVault?.name || "No Vault";

  async function submitCreateVault(e: React.FormEvent) {
    e.preventDefault();
    const name = newVaultName.trim();
    if (!name) return;
    const vault = await webApi.vaults.create({ name });
    setCreating(false);
    setNewVaultName("");
    setOpen(false);
    router.push(`/vaults/${vault.id}`);
  }

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button onClick={() => setOpen(!open)} className="vault-trigger">
        <span className="vault-name">{displayName}</span>
        <VaultChevronIcon className={`vault-chevron${open ? " vault-chevron-open" : ""}`} />
      </button>

      {open && (
        <div className="vault-dropdown">
          <div className="vault-dropdown-header">Vaults</div>

          <div className="vault-list">
            {vaults.map((vault) => {
              const isActive = vault.id === activeVault?.id;
              return (
                <div
                  key={vault.id}
                  className={`vault-item${isActive ? " vault-item-active" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    router.push(`/vaults/${vault.id}`);
                  }}
                >
                  <div className="vault-item-info">
                    <span className="vault-item-name">{vault.name}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="vault-dropdown-footer">
            {creating ? (
              <form onSubmit={submitCreateVault} className="flex gap-1">
                <input
                  autoFocus
                  value={newVaultName}
                  onChange={(e) => setNewVaultName(e.target.value)}
                  onBlur={() => { if (!newVaultName.trim()) setCreating(false); }}
                  onKeyDown={(e) => e.key === "Escape" && setCreating(false)}
                  placeholder="Tên vault mới"
                  className="w-full text-sm px-2 py-1 rounded-md bg-[var(--bg-tertiary)] outline-none ring-1 ring-[var(--accent)]"
                />
              </form>
            ) : (
              <button onClick={() => setCreating(true)} className="vault-create-btn">
                <PlusIcon size={12} />
                New vault
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
