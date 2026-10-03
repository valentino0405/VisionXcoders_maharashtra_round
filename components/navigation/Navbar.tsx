import Link from "next/link";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Shield, Activity, Users, Settings } from "lucide-react";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/50 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-violet-500" />
            <span className="text-xl font-bold tracking-tight text-white">FAIRDROP</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
            <Link href="/#how-it-works" className="hover:text-white transition-colors">How it works</Link>
            <Link href="/#fairness" className="hover:text-white transition-colors">Fairness</Link>
            <Show when="signed-in">
              <Link href="/drop" className="hover:text-white transition-colors flex items-center gap-2">
                <Users className="h-4 w-4" /> Drop
              </Link>
              <Link href="/admin" className="hover:text-white transition-colors flex items-center gap-2">
                <Activity className="h-4 w-4" /> Admin
              </Link>
            </Show>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Show when="signed-out">
            <div className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              <SignInButton />
            </div>
            <div className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors">
              <SignUpButton />
            </div>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  );
}
