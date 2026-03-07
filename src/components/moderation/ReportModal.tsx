"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { reportApi } from "@/lib/api";
import { X, Flag, Loader2, CheckCircle } from "lucide-react";

const reportReasons = [
  { value: "spam", label: "Spam" },
  { value: "nudity", label: "Nudity or sexual content" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "false_info", label: "False information" },
  { value: "violence", label: "Violence or threats" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "other", label: "Other" },
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "reel" | "user" | "comment";
  entityId: string;
}

export default function ReportModal({
  isOpen,
  onClose,
  entityType,
  entityId,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { getToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason) {
      setError("Please select a reason");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const token = await getToken();
      if (!token) return;
      await reportApi.create(entityType, entityId, reason, description, token);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setReason("");
        setDescription("");
      }, 1500);
    } catch {
      setError("Failed to submit report. You may have already reported this.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg rounded-t-3xl p-5 pb-8 ${
          isDark ? "bg-zinc-900" : "bg-white"
        }`}
      >
        {/* Handle bar */}
        <div className="flex justify-center mb-4">
          <div
            className={`w-10 h-1 rounded-full ${
              isDark ? "bg-white/20" : "bg-black/20"
            }`}
          />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors cursor-pointer ${
            isDark ? "hover:bg-white/10" : "hover:bg-black/10"
          }`}
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="flex flex-col items-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
            <p
              className={`font-semibold ${
                isDark ? "text-white" : "text-black"
              }`}
            >
              Report Submitted
            </p>
            <p
              className={`text-sm mt-1 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Thank you for helping keep our community safe
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-5">
              <Flag
                className={`h-5 w-5 ${
                  isDark ? "text-red-400" : "text-red-500"
                }`}
              />
              <h2
                className={`text-lg font-bold ${
                  isDark ? "text-white" : "text-black"
                }`}
              >
                Report {entityType}
              </h2>
            </div>

            {/* Reason selection */}
            <div className="space-y-2 mb-4">
              {reportReasons.map((r) => (
                <button
                  key={r.value}
                  onClick={() => {
                    setReason(r.value);
                    setError("");
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors cursor-pointer ${
                    reason === r.value
                      ? isDark
                        ? "bg-white/10 text-white border border-white/20"
                        : "bg-black/5 text-black border border-black/15"
                      : isDark
                        ? "text-gray-300 hover:bg-white/5 border border-transparent"
                        : "text-gray-700 hover:bg-black/[0.02] border border-transparent"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Optional description */}
            {reason === "other" && (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue..."
                rows={3}
                className={`w-full px-4 py-3 rounded-xl text-sm resize-none mb-4 outline-none ${
                  isDark
                    ? "bg-white/5 text-white placeholder:text-gray-600 border border-white/10"
                    : "bg-black/[0.02] text-black placeholder:text-gray-400 border border-black/10"
                }`}
              />
            )}

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !reason}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                reason
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : isDark
                    ? "bg-white/5 text-gray-600"
                    : "bg-black/5 text-gray-400"
              }`}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                "Submit Report"
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
