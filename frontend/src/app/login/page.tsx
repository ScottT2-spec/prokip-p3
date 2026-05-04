"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, Zap, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-prokip-navy to-prokip-navy-dark items-center justify-center p-12">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Zap size={40} className="text-prokip-gold" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Performance Pulse</h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Eliminating deadline drift and review bottlenecks through gamified, data-driven accountability.
          </p>
          <div className="flex gap-3 justify-center mt-8">
            {["A+", "A", "B", "C", "F"].map((g) => (
              <span
                key={g}
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white/90 bg-white/10"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center gap-3 mb-2 lg:hidden">
            <div className="w-10 h-10 bg-prokip-navy rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-prokip-gold" />
            </div>
            <h1 className="font-bold text-prokip-navy text-xl">Prokip P3</h1>
          </div>

          <h2 className="text-2xl font-bold text-prokip-navy mb-1">Welcome back</h2>
          <p className="text-[#64748B] mb-8">Sign in to your Performance Pulse account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="input-label">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11"
                  placeholder="you@prokip.africa"
                  required
                />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 pr-11"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-prokip-navy"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-[#94A3B8] text-xs mt-8">
            Prokip Performance Pulse — Internal Platform
          </p>
        </div>
      </div>
    </div>
  );
}
