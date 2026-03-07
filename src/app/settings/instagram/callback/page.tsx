"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { instagramApi } from "@/lib/api";
import { Instagram, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Connecting to Instagram…");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage("Instagram authorization was cancelled or denied.");
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received from Instagram.");
      return;
    }

    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          setStatus("error");
          setMessage("You must be signed in.");
          return;
        }

        await instagramApi.handleCallback(code, token);
        setStatus("success");
        setMessage("Instagram connected successfully!");
        setTimeout(() => router.replace("/settings/instagram"), 2000);
      } catch (err: unknown) {
        setStatus("error");
        setMessage(
          err instanceof Error
            ? err.message
            : "Failed to connect Instagram. Please try again.",
        );
      }
    })();
  }, [searchParams, getToken, router]);

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-6 ${
        isDark ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      <div className="flex flex-col items-center gap-5 text-center max-w-sm">
        {/* Icon */}
        <div
          className={`h-20 w-20 rounded-3xl flex items-center justify-center ${
            status === "success"
              ? "bg-green-500/10"
              : status === "error"
                ? "bg-red-500/10"
                : "bg-gradient-to-br from-purple-500/20 to-pink-500/20"
          }`}
        >
          {status === "loading" && (
            <Instagram className="h-10 w-10 text-purple-400" />
          )}
          {status === "success" && (
            <CheckCircle className="h-10 w-10 text-green-500" />
          )}
          {status === "error" && <XCircle className="h-10 w-10 text-red-500" />}
        </div>

        {/* Status */}
        {status === "loading" && (
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        )}

        <h1
          className={`text-xl font-bold ${
            status === "success"
              ? "text-green-500"
              : status === "error"
                ? "text-red-500"
                : isDark
                  ? "text-white"
                  : "text-black"
          }`}
        >
          {status === "loading"
            ? "Connecting…"
            : status === "success"
              ? "Connected!"
              : "Connection Failed"}
        </h1>

        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          {message}
        </p>

        {status === "error" && (
          <Link
            href="/settings/instagram"
            className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Back to Instagram Settings
          </Link>
        )}
      </div>
    </div>
  );
}

export default function InstagramCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
