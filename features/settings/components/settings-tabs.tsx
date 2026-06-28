"use client";

import { useState } from "react";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { ApiKeysSection } from "./api-keys-section";
import { StoragePreferencesSection } from "./storage-preferences-section";
import { NotificationsSection } from "./notifications-section";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuthStore } from "@/store";

const sections = [
  { value: "profile", label: "Profile", forAdmin: true },
  { value: "security", label: "Security", forAdmin: true },
  { value: "api-keys", label: "API keys", forAdmin: false },
  { value: "storage", label: "Storage preferences", forAdmin: false },
  { value: "notifications", label: "Notifications", forAdmin: false },
];

export function SettingsTabs() {
  const [active, setActive] = useState("profile");

  const { user } = useAuthStore();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  return (
    <Tabs value={active} onValueChange={setActive}>
      <TabsList className="mb-6 flex-wrap">
        {sections.map(
          (s) =>
            s.forAdmin && (
              <TabsTrigger key={s.value} value={s.value}>
                {s.label}
              </TabsTrigger>
            ),
        )}
      </TabsList>
      <TabsContent value="profile">
        <ProfileSection />
      </TabsContent>
      <TabsContent value="security">
        <SecuritySection />
      </TabsContent>
      {isAdmin && (
        <>
          <TabsContent value="api-keys">
            <ApiKeysSection />
          </TabsContent>
          <TabsContent value="storage">
            <StoragePreferencesSection />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationsSection />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}
