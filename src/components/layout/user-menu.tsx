"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function initials(nameOrEmail: string | null) {
  if (!nameOrEmail) return "U";
  const parts = nameOrEmail.trim().split(/\s+/).slice(0, 2);
  const chars = parts.map((p) => p[0]).join("");
  return chars.toUpperCase();
}

export function UserMenu({
  name,
  email,
  image,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-10 w-10 rounded-full p-0">
          <Avatar className="h-9 w-9">
            {image ? <AvatarImage src={image} alt={name ?? email ?? "User"} /> : null}
            <AvatarFallback>{initials(name ?? email ?? null)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="grid">
            <span className="truncate text-xs font-medium">{name ?? "User"}</span>
            <span className="truncate text-xs">{email ?? ""}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => (window.location.href = "/dashboard")}>Dashboard</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => (window.location.href = "/billing")}>Billing</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => (window.location.href = "/api/auth/signout")}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
