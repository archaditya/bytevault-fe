import { Metadata } from "next";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";

export const metadata: Metadata = {
  title: "Settings — PushPort",
};

export default function SettingsPage() {
  return <SettingsTabs />;
}
