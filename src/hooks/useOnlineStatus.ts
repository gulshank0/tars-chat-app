"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useCallback } from "react";

export function useOnlineStatus(clerkId: string | undefined) {
  const updateOnlineStatus = useMutation(api.users.updateOnlineStatus);

  const setOnline = useCallback(() => {
    if (clerkId) {
      updateOnlineStatus({ clerkId, isOnline: true });
    }
  }, [clerkId, updateOnlineStatus]);

  const setOffline = useCallback(() => {
    if (clerkId) {
      updateOnlineStatus({ clerkId, isOnline: false });
    }
  }, [clerkId, updateOnlineStatus]);

  useEffect(() => {
    if (!clerkId) return;

    // Set online when component mounts
    setOnline();

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setOnline();
      } else {
        setOffline();
      }
    };

    // Handle before unload (closing tab/browser)
    const handleBeforeUnload = () => {
      setOffline();
    };

    // Handle focus/blur
    const handleFocus = () => setOnline();
    const handleBlur = () => setOffline();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Heartbeat to keep status updated
    const heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") {
        setOnline();
      }
    }, 30000); // Every 30 seconds

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      clearInterval(heartbeat);
      setOffline();
    };
  }, [clerkId, setOnline, setOffline]);
}
