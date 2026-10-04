"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { ArrowRight, Moon, Shield, Activity, Users, UserRound } from "lucide-react";
import { useIsAdmin } from "@/lib/hooks/use-is-admin";

export function Navbar() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isAdmin = useIsAdmin();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#030611]/80 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        
        {/* Brand Logo with Electric Blue Radiant Emblem */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex items-center justify-center">
              <svg 
                viewBox="0 0 24 24" 
                className="w-6 h-6 text-cyan-400 fill-current drop-shadow-[0_0_12px_rgba(6,182,212,0.8)] group-hover:rotate-45 transition-transform duration-500"
              >
                <path d="M12 2 L13.5 8.5 L20 7 L15.5 12 L20 17 L13.5 15.5 L12 22 L10.5 15.5 L4 7 L10.5 8.5 Z" />
              </svg>
            </div>
            <span className="text-lg font-extrabold tracking-wider text-white uppercase font-sans flex items-center gap-1.5">
              FAIRDROP
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-cyan-400 border border-blue-500/20">
                PROD
              </span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {/* Landing section anchors: ONLY visible on homepage when user is signed out */}
            {isHomePage && (
              <Show when="signed-out">
                <Link href="#architecture" className="text-gray-400 hover:text-white transition-colors">
                  Architecture
                </Link>
                <Link href="#shield" className="text-gray-400 hover:text-white transition-colors">
                  Anti-Bot Shield
                </Link>
                <Link href="#fairness" className="text-gray-400 hover:text-white transition-colors">
                  Fairness Engine
                </Link>
                <Link href="#telemetry" className="text-gray-400 hover:text-white transition-colors">
                  Telemetry
                </Link>
              </Show>
            )}

            {/* Authenticated app navigation (shown on all pages when logged in) */}
            <Show when="signed-in">
              <Link 
                href="/drop" 
                className={`transition-colors flex items-center gap-1.5 ${
                  pathname === "/drop" ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-white"
                }`}
              >
                <Users className="h-4 w-4" /> Drop Window
              </Link>
              <Link href="/live-demo" className={`transition-colors ${pathname === "/live-demo" ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-white"}`}>Live Demo</Link>
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className={`transition-colors flex items-center gap-1.5 ${
                    pathname.startsWith("/admin") ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Activity className="h-4 w-4" /> Operations
                </Link>
              )}
              <Link 
                href="/ticket" 
                className={`transition-colors flex items-center gap-1.5 ${
                  pathname === "/ticket" ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-white"
                }`}
              >
                <Shield className="h-4 w-4" /> Ticket Proof
              </Link>
              <Link 
                href="/account" 
                className={`transition-colors flex items-center gap-1.5 ${
                  pathname === "/account" ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-white"
                }`}
              >
                <UserRound className="h-4 w-4" /> Profile
              </Link>
            </Show>
          </div>
        </div>

        {/* Right side: Dark Mode Icon & Glowing Blue CTA Button */}
        <div className="flex items-center gap-3.5">
          <button 
            type="button"
            aria-label="Toggle dark mode"
            className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300"
          >
            <Moon className="w-4 h-4" />
          </button>

          <Show when="signed-out">
            <div className="hidden sm:block text-sm font-medium text-gray-300 hover:text-white transition-colors px-2">
              <SignInButton />
            </div>
            <SignUpButton>
              <button 
                type="button"
                className="group relative inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(37,99,235,0.45)] hover:shadow-[0_0_28px_rgba(6,182,212,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
              >
                <span>Enter Drop</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-300" />
              </button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <Link 
              href="/drop"
              className="group relative inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(37,99,235,0.45)] hover:shadow-[0_0_28px_rgba(6,182,212,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
            >
              <span>Enter Drop</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-300" />
            </Link>
            <div className="pl-1">
              <UserButton />
            </div>
          </Show>
        </div>

      </div>
    </nav>
  );
}
