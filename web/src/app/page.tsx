"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { webApi } from "@/lib/webApi";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    webApi.auth
      .me()
      .then(() => router.replace("/vaults"))
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center text-[var(--text-secondary)]">
      Loading…
    </div>
  );
}
