"use client";

import { useTheme, Theme } from "@/context/ThemeContext";
import { X, Sun, Moon, Monitor, Bell, MessageSquare, Shield, Info } from "lucide-react";
import { useState } from "react";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [enterToSend, setEnterToSend] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-950 shadow-2xl border border-gray-200 dark:border-zinc-800">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[70vh]">
          {/* Appearance */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40">
                {resolvedTheme === "dark" ? (
                  <Moon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <Sun className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Appearance</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Choose your preferred theme</p>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-3 transition ${
                    theme === opt.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                  }`}
                >
                  {opt.icon}
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                <Bell className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
            </div>
            <div className="space-y-3">
              <ToggleRow
                label="Push Notifications"
                description="Get notified about new messages"
                checked={notificationsEnabled}
                onChange={setNotificationsEnabled}
              />
              <ToggleRow
                label="Message Sounds"
                description="Play sound on new messages"
                checked={soundEnabled}
                onChange={setSoundEnabled}
              />
            </div>
          </div>

          {/* Messaging */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                <MessageSquare className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Messaging</h3>
            </div>
            <div className="space-y-3">
              <ToggleRow
                label="Enter to Send"
                description="Press Enter to send messages"
                checked={enterToSend}
                onChange={setEnterToSend}
              />
              <ToggleRow
                label="Read Receipts"
                description="Show when messages are read"
                checked={readReceipts}
                onChange={setReadReceipts}
              />
            </div>
          </div>

          {/* Privacy */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
                <Shield className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Privacy</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Online Status</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Show when you&apos;re active</p>
                </div>
                <span className="text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 font-medium">
                  Visible
                </span>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
                <Info className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">About</h3>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">App Name</span>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">ChatApp</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Version</span>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">1.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Theme</span>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 capitalize">
                  {theme === "system" ? `System (${resolvedTheme})` : theme}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-zinc-800 px-5 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
