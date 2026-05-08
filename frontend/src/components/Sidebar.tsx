"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  ListTodo,
  LogOut,
  Zap,
  ChevronLeft,
  Menu,
  Trophy,
  Medal,
  Upload,
  Gift,
} from "lucide-react";
import GradeBadge from "./GradeBadge";
import { useState } from "react";

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "LEAD", "MEMBER"] },
  { href: "/users", label: "Users", icon: Users, roles: ["ADMIN", "LEAD"] },
  { href: "/policies", label: "Policies", icon: FileText, roles: ["ADMIN", "LEAD"] },
  { href: "/departments", label: "Departments", icon: Building2, roles: ["ADMIN"] },
  { href: "/grades", label: "Grades", icon: Trophy, roles: ["ADMIN", "LEAD", "MEMBER"] },
  { href: "/rewards", label: "Policies & Rewards", icon: Gift, roles: ["ADMIN", "LEAD"] },
  { href: "/leaderboard", label: "Leaderboard", icon: Medal, roles: ["ADMIN", "LEAD", "MEMBER"] },
  { href: "/bulk-upload", label: "Bulk Upload", icon: Upload, roles: ["ADMIN", "LEAD"] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const visibleItems = menuItems.filter((item) => item.roles.includes(user.role));

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6">
        <div className="w-10 h-10 bg-prokip-navy rounded-xl flex items-center justify-center flex-shrink-0">
          <Zap size={20} className="text-prokip-gold" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-bold text-prokip-navy text-lg leading-tight">Prokip P3</h1>
            <p className="text-[11px] text-[#94A3B8] font-medium">Performance Pulse</p>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 mt-2">
        <p className={`section-label px-3 mb-3 ${collapsed ? "text-center text-[9px]" : ""}`}>
          {collapsed ? "•••" : "NAVIGATION"}
        </p>
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    active
                      ? "bg-prokip-navy text-white"
                      : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-prokip-navy"
                  }`}
                >
                  <item.icon size={20} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="px-3 pb-4 mt-auto">
        <div className={`bg-[#F8FAFC] rounded-xl p-3 ${collapsed ? "text-center" : ""}`}>
          {!collapsed && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-prokip-navy rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-prokip-navy truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[11px] text-[#94A3B8]">{user.role}</p>
                </div>
                <GradeBadge grade={user.grade} size="sm" />
              </div>
            </>
          )}
          <button
            onClick={logout}
            className={`flex items-center gap-2 text-sm text-[#64748B] hover:text-grade-red transition-colors ${
              collapsed ? "mx-auto" : "w-full"
            }`}
          >
            <LogOut size={16} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>

      {/* Collapse Toggle (desktop) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white border border-[#E2E8F0] rounded-full items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
      >
        <ChevronLeft size={14} className={`text-gray-400 transition-transform ${collapsed ? "rotate-180" : ""}`} />
      </button>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-prokip-navy-dark rounded-lg shadow-card"
      >
        <Menu size={20} className="text-white" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-[#E2E8F0] flex flex-col z-40 transition-all duration-200 ${
          collapsed ? "w-[72px]" : "w-[260px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
