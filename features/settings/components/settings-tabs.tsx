"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { BillingSection } from "./billing-section";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function SettingsTabs() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [active, setActive] = useState(tabParam === "billing" ? "billing" : tabParam === "security" ? "security" : "profile");

  useEffect(() => {
    if (tabParam === "billing" || tabParam === "security" || tabParam === "profile") {
      setActive(tabParam);
    }
  }, [tabParam]);

  return (
    <Tabs value={active} onValueChange={setActive}>
      <TabsList className="mb-6 overflow-x-auto">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="billing">Billing & Plans</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <ProfileSection />
      </TabsContent>
      <TabsContent value="security">
        <SecuritySection />
      </TabsContent>
      <TabsContent value="billing">
        <BillingSection />
      </TabsContent>
    </Tabs>
  );
}
