"use client";

import { useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import BottomNav from "@/components/navigation/BottomNav";
import { ArrowLeft, Upload, Film, Loader2, X, Hash } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function CreateReelPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { getToken } = useAuth();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please select a video file");
      return;
    }

    if (file.size > 250 * 1024 * 1024) {
      setError("Video must be under 250MB");
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setError(null);
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!videoFile) return;
    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("caption", caption);
      formData.append("hashtags", hashtags);

      setProgress(30);

      const res = await fetch(`${API_BASE}/api/v1/upload/video`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      setProgress(80);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      setProgress(100);

      // Success — navigate to reels
      setTimeout(() => router.push("/reels"), 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-black" : "bg-white"} pb-20`}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div
          className={`flex items-center gap-3 px-5 py-4 border-b ${
            isDark ? "border-white/10" : "border-black/10"
          }`}
        >
          <Link
            href="/reels"
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? "hover:bg-white/10 text-gray-400"
                : "hover:bg-black/10 text-gray-500"
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1
            className={`text-xl font-bold flex-1 ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            New Reel
          </h1>
          {videoFile && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 ${
                isDark
                  ? "bg-white text-black hover:bg-gray-200"
                  : "bg-black text-white hover:bg-gray-800"
              }`}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Share"
              )}
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Video upload area */}
          {!videoPreview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full aspect-[9/16] max-h-[500px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer ${
                isDark
                  ? "border-white/15 hover:border-white/30 bg-white/[0.02]"
                  : "border-black/15 hover:border-black/30 bg-black/[0.02]"
              }`}
            >
              <div
                className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
                  isDark ? "bg-white/10" : "bg-black/10"
                }`}
              >
                <Upload
                  className={`h-8 w-8 ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`}
                />
              </div>
              <div className="text-center">
                <p
                  className={`font-semibold ${
                    isDark ? "text-white" : "text-black"
                  }`}
                >
                  Upload video
                </p>
                <p
                  className={`text-xs mt-1 ${
                    isDark ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  MP4, WebM • Max 250MB
                </p>
              </div>
            </button>
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                src={videoPreview}
                controls
                className="w-full max-h-[500px] rounded-2xl bg-black object-contain"
              />
              <button
                onClick={removeVideo}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Caption */}
          <div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              maxLength={2200}
              rows={3}
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none transition-colors ${
                isDark
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-white/25"
                  : "bg-black/5 border-black/10 text-black placeholder-gray-400 focus:border-black/25"
              }`}
            />
            <p
              className={`text-xs text-right mt-1 ${
                isDark ? "text-gray-700" : "text-gray-400"
              }`}
            >
              {caption.length}/2200
            </p>
          </div>

          {/* Hashtags */}
          <div className="relative">
            <Hash
              className={`absolute left-3 top-3 h-4 w-4 ${
                isDark ? "text-gray-600" : "text-gray-400"
              }`}
            />
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="Add hashtags (comma-separated)"
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                isDark
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-white/25"
                  : "bg-black/5 border-black/10 text-black placeholder-gray-400 focus:border-black/25"
              }`}
            />
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-2">
              <div
                className={`h-2 rounded-full overflow-hidden ${
                  isDark ? "bg-white/10" : "bg-black/10"
                }`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isDark ? "bg-white" : "bg-black"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p
                className={`text-xs text-center ${
                  isDark ? "text-gray-500" : "text-gray-500"
                }`}
              >
                Uploading... {progress}%
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
