"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import { PageSkeleton } from "./LoadingSkeleton";

interface Props {
  children: React.ReactNode;
  title?: string;
}

export default function AppShell({ children, title }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-prokip-navy/20 border-t-prokip-navy rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          {title && (
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-prokip-navy">{title}</h1>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
