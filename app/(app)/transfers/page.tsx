import { Metadata } from "next";
import { TransfersList } from "@/features/transfers/components/transfers-list";

export const metadata: Metadata = {
  title: "Transfers — PushPostVault",
};

export default function TransfersPage() {
  return <TransfersList />;
}
