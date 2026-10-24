"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DisableMfaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (code: string) => Promise<void>;
  isLoading?: boolean;
}

export function DisableMfaModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: DisableMfaModalProps) {
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) return;
    await onConfirm(code.trim());
    setCode("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCode("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-bg-surface border-border-strong text-ink">
        <DialogHeader>
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
          </div>
          <DialogDescription className="mt-2 text-sm text-ink-muted">
            Disabling 2FA reduces your account security. Enter the 6-digit code from your Authenticator app to proceed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink-muted">Authenticator Code</label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center font-mono tracking-widest text-lg"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={isLoading || code.trim().length !== 6}
            >
              {isLoading ? "Disabling..." : "Disable 2FA"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
