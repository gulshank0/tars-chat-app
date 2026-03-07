"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { profileApi, type UserProfile } from "@/lib/api";
import { X, Loader2, Check, Lock, Globe } from "lucide-react";

interface EditProfileModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (profile: UserProfile) => void;
}

const MAX_BIO = 150;

export default function EditProfileModal({
  profile,
  isOpen,
  onClose,
  onUpdated,
}: EditProfileModalProps) {
  const { getToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio || "");
  const [website, setWebsite] = useState(profile.website || "");
  const [isPrivate, setIsPrivate] = useState(profile.isPrivate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Reset form whenever profile changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setDisplayName(profile.displayName);
      setUsername(profile.username);
      setBio(profile.bio || "");
      setWebsite(profile.website || "");
      setIsPrivate(profile.isPrivate);
      setError(null);
      setSaved(false);
    }
  }, [isOpen, profile]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const updated = await profileApi.updateMyProfile(token, {
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        website: website.trim() || undefined,
        isPrivate,
      });
      setSaved(true);
      onUpdated(updated);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to update profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = `w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
    isDark
      ? "bg-white/[0.04] border-white/10 text-white placeholder:text-gray-600 focus:border-white/30"
      : "bg-black/[0.03] border-black/10 text-black placeholder:text-gray-400 focus:border-black/30"
  }`;

  const labelClass = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
    isDark ? "text-gray-500" : "text-gray-400"
  }`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal slide-up */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto rounded-t-3xl shadow-2xl ${
          isDark ? "bg-[#111]" : "bg-white"
        }`}
        style={{ maxHeight: "90dvh", overflowY: "auto" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className={`w-10 h-1 rounded-full ${isDark ? "bg-white/20" : "bg-black/20"}`}
          />
        </div>

        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDark ? "border-white/[0.08]" : "border-black/[0.08]"
          }`}
        >
          <h2
            className={`text-lg font-bold ${isDark ? "text-white" : "text-black"}`}
          >
            Edit Profile
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? "hover:bg-white/10 text-gray-400"
                : "hover:bg-black/10 text-gray-500"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-6 space-y-5 pb-8">
          {/* Display Name */}
          <div>
            <label className={labelClass}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="Your name"
              className={inputClass}
            />
          </div>

          {/* Username */}
          <div>
            <label className={labelClass}>Username</label>
            <div className="relative">
              <span
                className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${
                  isDark ? "text-gray-500" : "text-gray-400"
                }`}
              >
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.replace(/[^a-z0-9_.]/gi, ""))
                }
                maxLength={30}
                placeholder="username"
                className={`${inputClass} pl-8`}
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className={labelClass}>
              Bio
              <span
                className={`ml-2 font-normal ${
                  bio.length > MAX_BIO - 20 ? "text-orange-400" : ""
                }`}
              >
                {bio.length}/{MAX_BIO}
              </span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
              rows={3}
              placeholder="Tell people about yourself…"
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </div>

          {/* Website */}
          <div>
            <label className={labelClass}>Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yoursite.com"
              className={inputClass}
            />
          </div>

          {/* Private toggle */}
          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              isDark
                ? "border-white/[0.08] bg-white/[0.02]"
                : "border-black/[0.08] bg-black/[0.02]"
            }`}
          >
            <div className="flex items-center gap-3">
              {isPrivate ? (
                <Lock
                  className={`h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                />
              ) : (
                <Globe
                  className={`h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                />
              )}
              <div>
                <p
                  className={`text-sm font-semibold ${isDark ? "text-white" : "text-black"}`}
                >
                  Private Account
                </p>
                <p
                  className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}
                >
                  Only approved followers can see your reels
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                isPrivate
                  ? isDark
                    ? "bg-white"
                    : "bg-black"
                  : isDark
                    ? "bg-white/20"
                    : "bg-black/20"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full shadow transition-all duration-200 ${
                  isPrivate
                    ? isDark
                      ? "translate-x-5 bg-black"
                      : "translate-x-5 bg-white"
                    : "translate-x-0.5 bg-white"
                }`}
              />
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 px-4 py-2.5 rounded-xl">
              {error}
            </p>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all cursor-pointer ${
              saved
                ? "bg-green-500 text-white"
                : isDark
                  ? "bg-white text-black hover:bg-gray-100 disabled:opacity-50"
                  : "bg-black text-white hover:bg-gray-900 disabled:opacity-50"
            }`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
