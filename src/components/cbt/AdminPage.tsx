import * as React from "react"
import { cn } from "@/lib/utils"

export function AdminPage({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("w-full space-y-6", className)} {...props} />

}

import { useThemeStore } from "@/lib/cbt/theme-store"

export function AdminPageHeader({ 
  title, 
  description, 
  action 
}: { 
  title: React.ReactNode, 
  description?: React.ReactNode, 
  action?: React.ReactNode 
}) {
  const { theme } = useThemeStore()
  
  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
      <div className={cn("flex flex-col items-start", theme === "neobrutalism" ? "gap-2" : "space-y-1")}>
        <h1 className={cn(
          "tracking-tight",
          theme === "neobrutalism" 
            ? "text-3xl font-black uppercase text-[color:var(--neo-text)] bg-[color:var(--neo-bg)] px-3 py-1 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] inline-block"
            : "text-2xl font-semibold text-slate-900 dark:text-zinc-100"
        )}>
          {title}
        </h1>

        {description && (
          <p className={cn(
            theme === "neobrutalism"
              ? "text-sm font-bold text-[color:var(--neo-text)] bg-white px-3 py-1.5 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] inline-block"
              : "text-sm text-slate-500"
          )}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2 shrink-0">{action}</div>}
    </div>
  )
}

export function AdminPageContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm", className)} 
      {...props} 
    />
  )
}
