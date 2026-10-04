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
        const message =
          response.status === 401
            ? "Sign in to join the drop."
            : response.status === 429
              ? "Too many requests. Please try again in a few seconds."
              : response.status === 403
                ? "Access is temporarily restricted. Please try again later."
                : "Unable to join the drop.";
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
        className="group flex h-[3.75rem] w-full items-center justify-center gap-3 rounded-2xl border border-cyan-100/25 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-base font-bold text-white shadow-[0_0_28px_rgba(37,99,235,0.38)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_38px_rgba(34,211,238,0.42)] active:translate-y-0 disabled:cursor-wait disabled:opacity-70 sm:text-lg"
      >
        {isJoining ? "JOINING..." : "JOIN THE DROP"}
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-center text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </>
  );
}
