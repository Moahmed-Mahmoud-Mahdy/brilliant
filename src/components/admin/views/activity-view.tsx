"use client";

import { useQuery } from "@tanstack/react-query";
import { History, User } from "lucide-react";
import { api } from "@/lib/api";
import type { ActivityLogDTO } from "@/lib/types";
import { ACTION_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function parseSummary(log: ActivityLogDTO): string {
  if (!log.details) return "—";
  try {
    const parsed = JSON.parse(log.details) as { summary?: string } | string;
    if (typeof parsed === "string") return parsed;
    if (parsed.summary) return parsed.summary;
    return log.details;
  } catch {
    return log.details;
  }
}

export default function ActivityView() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: () => api.admin.activityLog(),
  });

  const logs = [...(data?.logs ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div>
        <h1 className="font-display text-2xl font-bold">سجل النشاط</h1>
        <p className="text-sm text-muted-foreground">
          كل الإجراءات الإدارية على المتجر — الأحدث أولًا
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <History className="h-12 w-12 opacity-40" />
            <p className="text-sm">لا يوجد نشاط مسجَّل بعد</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto scrollbar-thin p-4">
            <ol className="relative space-y-0">
              {/* Timeline spine */}
              <span
                aria-hidden
                className="absolute top-2 bottom-2 right-[11px] w-px bg-border"
              />
              {logs.map((log) => (
                <li key={log.id} className="relative pr-8 pb-6 last:pb-0">
                  {/* Timeline dot */}
                  <span
                    aria-hidden
                    className="absolute right-[7px] top-1.5 z-10 h-3 w-3 rounded-full border-2 border-primary bg-card"
                  />
                  <div className="rounded-xl border border-border/70 bg-background/40 p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-primary/50 text-primary"
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("ar-EG")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">
                      {parseSummary(log)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {log.adminName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.adminName}
                        </span>
                      )}
                      {log.entityType && (
                        <span dir="ltr" className="font-mono text-[11px] opacity-80">
                          {log.entityType}
                          {log.entityId ? `#${log.entityId.slice(0, 8)}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
