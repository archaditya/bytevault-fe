"use client";

import { useState } from "react";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function SettingsTabs() {
  const [active, setActive] = useState("profile");

  return (
    <Tabs value={active} onValueChange={setActive}>
      <TabsList className="mb-6 overflow-x-auto">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <ProfileSection />
      </TabsContent>
      <TabsContent value="security">
        <SecuritySection />
      </TabsContent>
    </Tabs>
  );
}
