"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { GraphView } from "@noteriv/ui/graph";
import { createWebVaultAdapter } from "@/lib/webVaultAdapter";

export default function GraphPage() {
  const params = useParams<{ vaultId: string }>();
  const router = useRouter();
  const vaultId = params.vaultId;
  const adapter = useMemo(() => createWebVaultAdapter(vaultId), [vaultId]);

  return (
    <GraphView
      adapter={adapter}
      currentNoteId={null}
      onNoteSelect={(noteId) => router.push(`/vaults/${vaultId}?note=${noteId}`)}
      onClose={() => router.push(`/vaults/${vaultId}`)}
    />
  );
}
