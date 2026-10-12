"use client";

import { useParams, useRouter } from "next/navigation";
import GraphView from "@/components/GraphView";

export default function GraphPage() {
  const params = useParams<{ vaultId: string }>();
  const router = useRouter();
  const vaultId = params.vaultId;

  return (
    <GraphView
      vaultId={vaultId}
      currentNoteId={null}
      onNoteSelect={(noteId) => router.push(`/vaults/${vaultId}?note=${noteId}`)}
      onClose={() => router.push(`/vaults/${vaultId}`)}
    />
  );
}
