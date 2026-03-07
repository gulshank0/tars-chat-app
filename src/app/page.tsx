"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useEffect } from "react";
import {
  MessageSquare,
  Users,
  Zap,
  Shield,
  Globe,
  Smile,
  Sun,
  Moon,
} from "lucide-react";

export default function LandingPage() {
  const { isSignedIn } = useUser();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  // Onboarding: redirect signed-in users straight to /explore
  useEffect(() => {
    if (isSignedIn) {
      router.replace("/explore");
    }
  }, [isSignedIn, router]);

  // Show nothing while redirecting
  if (isSignedIn) return null;

  return (
    <div
      className={`min-h-screen overflow-x-hidden ${isDark ? "bg-black text-white" : "bg-white text-black"}`}
    >
      {/* Subtle background gradient orbs — monochrome */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[128px] animate-pulse ${isDark ? "bg-white/[0.03]" : "bg-black/[0.03]"}`}
        />
        <div
          className={`absolute top-1/3 -right-20 w-80 h-80 rounded-full blur-[128px] animate-pulse ${isDark ? "bg-white/[0.04]" : "bg-black/[0.04]"}`}
          style={{ animationDelay: "2s" }}
        />
        <div
          className={`absolute -bottom-40 left-1/3 w-96 h-96 rounded-full blur-[128px] animate-pulse ${isDark ? "bg-white/[0.03]" : "bg-black/[0.03]"}`}
          style={{ animationDelay: "4s" }}
        />
      </div>

      {/* ─── Navbar ─── */}
      <nav
        className={`relative z-50 border-b backdrop-blur-xl ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]"}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-shadow duration-300 ${isDark ? "bg-white shadow-white/10 group-hover:shadow-white/20" : "bg-black shadow-black/15 group-hover:shadow-black/25"}`}
            >
              <MessageSquare
                className={`h-5 w-5 ${isDark ? "text-black" : "text-white"}`}
              />
            </div>
            <span
              className={`text-xl font-bold ${isDark ? "text-white" : "text-black"}`}
            >
              Tars Chat
            </span>
          </Link>

          {/* Auth + Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${isDark ? "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white" : "border-black/10 bg-black/5 text-gray-600 hover:bg-black/10 hover:text-black"}`}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {isSignedIn ? (
              <Link
                href="/explore"
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 ${isDark ? "bg-white text-black shadow-white/10 hover:shadow-white/20" : "bg-black text-white shadow-black/15 hover:shadow-black/25"}`}
              >
                Open App
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className={`px-5 py-2.5 rounded-xl border text-sm font-medium active:scale-95 transition-all duration-200 ${isDark ? "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20" : "border-black/10 bg-black/5 text-gray-700 hover:bg-black/10 hover:text-black hover:border-black/20"}`}
                >
                  Log In
                </Link>
                <Link
                  href="/sign-up"
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 ${isDark ? "bg-white text-black shadow-white/10 hover:shadow-white/20" : "bg-black text-white shadow-black/15 hover:shadow-black/25"}`}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative z-10 pt-24 pb-20 md:pt-36 md:pb-32">
        <div className="max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-sm mb-8 ${isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"}`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isDark ? "bg-white" : "bg-black"}`}
              ></span>
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${isDark ? "bg-white" : "bg-black"}`}
              ></span>
            </span>
            <span
              className={`text-xs font-medium tracking-wide uppercase ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Real-Time · Instant · Secure
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-tight tracking-tight">
            <span className={isDark ? "text-white" : "text-black"}>
              Messaging that
            </span>
            <br />
            <span className={isDark ? "text-gray-500" : "text-gray-400"}>
              feels alive.
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className={`mt-8 max-w-2xl mx-auto text-lg md:text-xl leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}
          >
            Connect with your team instantly. One-on-one chats, groups, typing
            indicators, emoji reactions, read receipts — all delivered in
            real-time with zero&nbsp;polling.
          </p>

          {/* CTA Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={isSignedIn ? "/explore" : "/sign-up"}
              className={`group relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 ${isDark ? "bg-white text-black shadow-white/10 hover:shadow-white/20" : "bg-black text-white shadow-black/15 hover:shadow-black/25"}`}
            >
              Get Started Free
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <Link
              href="#features"
              className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl border font-medium text-lg transition-all duration-200 ${isDark ? "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20" : "border-black/10 bg-black/5 text-gray-700 hover:bg-black/10 hover:text-black hover:border-black/20"}`}
            >
              Explore Features
            </Link>
          </div>

          {/* Tech line */}
          <p
            className={`mt-10 text-sm ${isDark ? "text-gray-700" : "text-gray-400"}`}
          >
            Built with Next.js 16 &middot; Convex &middot; Clerk &middot;
            TypeScript
          </p>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="relative z-10 py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className={`text-3xl sm:text-4xl font-bold ${isDark ? "text-white" : "text-black"}`}
            >
              Everything you need to stay connected
            </h2>
            <p
              className={`mt-4 text-lg max-w-xl mx-auto ${isDark ? "text-gray-500" : "text-gray-500"}`}
            >
              Powerful features built on a reactive backend — no compromises.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`group relative rounded-2xl border backdrop-blur-sm p-8 transition-all duration-300 ${isDark ? "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10" : "border-black/[0.06] bg-black/[0.02] hover:bg-black/[0.05] hover:border-black/10"}`}
              >
                {/* Icon */}
                <div
                  className={`inline-flex items-center justify-center h-12 w-12 rounded-xl mb-5 ${isDark ? "bg-white/10" : "bg-black/10"}`}
                >
                  <feature.icon
                    className={`h-6 w-6 ${isDark ? "text-white" : "text-black"}`}
                  />
                </div>

                <h3
                  className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-black"}`}
                >
                  {feature.title}
                </h3>
                <p
                  className={`text-sm leading-relaxed ${isDark ? "text-gray-500" : "text-gray-500"}`}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="relative z-10 py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6">
          <div
            className={`relative rounded-3xl border p-12 md:p-16 text-center overflow-hidden ${isDark ? "border-white/[0.06] bg-white/[0.03]" : "border-black/[0.06] bg-black/[0.03]"}`}
          >
            {/* Background glow */}
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full blur-[96px] ${isDark ? "bg-white/[0.04]" : "bg-black/[0.04]"}`}
            />

            <h2
              className={`relative text-3xl sm:text-4xl font-bold mb-4 ${isDark ? "text-white" : "text-black"}`}
            >
              Ready to start chatting?
            </h2>
            <p
              className={`relative text-lg mb-10 max-w-lg mx-auto ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Create your free account in seconds. No credit card required.
            </p>
            <Link
              href={isSignedIn ? "/explore" : "/sign-up"}
              className={`relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 ${isDark ? "bg-white text-black shadow-white/10 hover:shadow-white/20" : "bg-black text-white shadow-black/15 hover:shadow-black/25"}`}
            >
              {isSignedIn ? "Open Chat" : "Get Started Free"}
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer
        className={`relative z-10 border-t py-10 ${isDark ? "border-white/[0.06]" : "border-black/[0.06]"}`}
      >
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${isDark ? "bg-white" : "bg-black"}`}
            >
              <MessageSquare
                className={`h-3.5 w-3.5 ${isDark ? "text-black" : "text-white"}`}
              />
            </div>
            <span
              className={`text-sm font-semibold ${isDark ? "text-gray-500" : "text-gray-500"}`}
            >
              Tars Chat
            </span>
          </div>
          <p
            className={`text-xs ${isDark ? "text-gray-700" : "text-gray-400"}`}
          >
            &copy; {new Date().getFullYear()} Tars Chat. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Feature card data ─── */
const features = [
  {
    icon: Zap,
    title: "Real-Time Messaging",
    description:
      "Messages arrive instantly via reactive subscriptions — no polling, no delays, just pure speed.",
  },
  {
    icon: Users,
    title: "1:1 & Group Chats",
    description:
      "DM anyone directly or create named group chats with multiple members. Sender labels keep things clear.",
  },
  {
    icon: Globe,
    title: "Online Presence",
    description:
      "Green dots show who's online in real time, powered by heartbeats and page-visibility tracking.",
  },
  {
    icon: MessageSquare,
    title: "Typing Indicators",
    description:
      "See animated dots when someone is composing a reply — visible in the chat and conversation list.",
  },
  {
    icon: Shield,
    title: "Read Receipts & Badges",
    description:
      "Track unread counts per conversation, auto-mark as read on open, and never miss a message.",
  },
  {
    icon: Smile,
    title: "Emoji Reactions",
    description:
      "React to messages with 👍 ❤️ 😂 😮 😢 — toggle on/off with grouped counts per reaction.",
  },
];
