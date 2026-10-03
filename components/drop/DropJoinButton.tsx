"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DropJoinButton() {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function joinDrop() {
    if (isJoining) {
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const response = await fetch("/api/drop/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropId: "fairdrop-demo" }),
      });

      if (!response.ok) {
        const message = response.status === 401 ? "Sign in to join the drop." : "Unable to join the drop.";
        setError(message);
        return;
      }

      router.push("/queue");
    } catch {
      setError("Unable to join the drop.");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={joinDrop}
        disabled={isJoining}
        className="w-full flex items-center justify-center gap-3 h-16 rounded-xl bg-white text-black font-bold text-xl hover:bg-gray-200 transition-all glow-border disabled:cursor-wait disabled:opacity-70"
      >
        {isJoining ? "JOINING..." : "JOIN THE DROP"}
        <ArrowRight className="h-6 w-6" />
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-center text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </>
  );
}
