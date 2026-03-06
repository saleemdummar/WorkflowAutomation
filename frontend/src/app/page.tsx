"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isAdmin, isSuperAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        if (isSuperAdmin || isAdmin) {
          router.push("/admin");
        } else {
          router.push("/forms");
        }
      } else {
        router.push("/auth/login");
      }
    }
  }, [isAuthenticated, isLoading, isAdmin, isSuperAdmin, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
