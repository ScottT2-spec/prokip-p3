"use client";

import { Inbox } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, icon, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-[#F1F5F9] rounded-2xl flex items-center justify-center mb-4">
        {icon || <Inbox size={28} className="text-[#94A3B8]" />}
      </div>
      <h3 className="text-lg font-semibold text-prokip-navy mb-1">{title}</h3>
      {description && (
        <p className="text-[#64748B] text-sm max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
