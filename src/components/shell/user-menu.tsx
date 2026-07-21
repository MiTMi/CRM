"use client";

import * as React from "react";
import { ChevronsUpDown, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { EntityAvatar } from "@/components/entity-avatar";
import { Badge } from "@/components/ui/badge";
import { logout } from "@/lib/actions/auth";

export interface SessionUser {
  id: string;
  name: string;
  title: string;
  accent: string;
  role: "admin" | "technician";
}

export function UserMenu({ user }: { user: SessionUser }) {
  const { isMobile } = useSidebar();
  const [pending, startTransition] = React.useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg">
          <EntityAvatar name={user.name} accent={user.accent} size="sm" />
          <span className="grid flex-1 text-left leading-tight">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.title}
            </span>
          </span>
          <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        side={isMobile ? "bottom" : "right"}
        align="end"
      >
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <EntityAvatar name={user.name} accent={user.accent} size="sm" />
          <div className="grid flex-1 leading-tight">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.title}
            </span>
          </div>
        </DropdownMenuLabel>
        {user.role === "admin" && (
          <div className="px-2 pb-1.5">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="size-3" />
              Admin
            </Badge>
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            startTransition(async () => {
              toast("Signing out…");
              await logout();
            });
          }}
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
