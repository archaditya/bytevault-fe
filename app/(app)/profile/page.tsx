"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime, formatBytes } from "@/lib/utils";
import { Mail, Shield, Calendar, HardDrive } from "lucide-react";
import { useAuthStore } from "@/store";
import { useQuota } from "@/services";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { data: quota } = useQuota();

  if (!user) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback className="text-lg">{user.avatar}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">{user.name}</h2>
              <Badge variant="default" className="capitalize">{user.role}</Badge>
            </div>
            <p className="text-[13px] text-ink-muted">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow icon={Mail} label="Email" value={user.email} />
          <InfoRow icon={Calendar} label="Member since" value={formatRelativeTime(user.joinedAt)} />
          <InfoRow icon={Shield} label="Role" value={user.role} />
          <InfoRow icon={HardDrive} label="Storage Used" value={quota ? formatBytes(quota.used_bytes) : "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-bg-overlay text-ink-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</p>
        <p className="text-[13px] font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}
