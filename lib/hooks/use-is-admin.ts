"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * Client-side hook that checks whether the signed-in user is a FairDrop admin.
 * Returns `null` while loading, `true`/`false` once resolved.
 */
export function useIsAdmin(): boolean | null {
  const { isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    let cancelled = false;

    fetch("/api/admin/check", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { isAdmin: false }))
      .then((data: { isAdmin: boolean }) => {
        if (!cancelled) setIsAdmin(data.isAdmin);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  if (!isSignedIn) return false;
  return isAdmin;
}
