"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/lib/store";
import { authApi } from "@/lib/api";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const run = async () => {
      const token = params.get("token");
      const refresh = params.get("refresh");
      const complete = params.get("complete");

      if (!token || !refresh) {
        toast.error("Google login failed. Please try again.");
        router.replace("/login");
        return;
      }

      try {
        localStorage.setItem("cravecart_token", token);
        localStorage.setItem("cravecart_refresh_token", refresh);

        const user = await authApi.me();
        setAuth(user, token);

        // Ensure middleware cookies are set immediately after OAuth flow.
        document.cookie = `cravecart_token=${token}; path=/; SameSite=Lax; max-age=86400`;
        document.cookie = `cravecart_profile_complete=${user.is_profile_complete}; path=/; SameSite=Lax; max-age=86400`;

        if (complete === "false" || !user.is_profile_complete) {
          router.replace("/complete-profile");
        } else {
          router.replace("/");
        }
      } catch {
        toast.error("Unable to finish Google login.");
        router.replace("/login");
      }
    };

    run();
  }, [params, router, setAuth]);

  return (
    <main className="min-h-screen bg-[#0C0B09] text-[#F5EDD8] flex items-center justify-center px-6">
      <div className="flex items-center gap-3 text-sm">
        <Loader2 size={16} className="animate-spin text-[#E8A830]" />
        Completing Google sign-in...
      </div>
    </main>
  );
}
