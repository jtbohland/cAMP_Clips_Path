import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

const ADMIN_PASSWORD = "smoreenablement";
const ADMIN_STORAGE_KEY = "cliptracker_admin_auth";

type PasswordGateProps = {
  children: React.ReactNode;
};

export default function PasswordGate({ children }: PasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(ADMIN_STORAGE_KEY) === "true";
  });
  const [password, setPassword] = useState("");

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem(ADMIN_STORAGE_KEY, "true");
    } else {
      toast.error("Incorrect password");
    }
  }, [password]);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full items-center justify-center p-6" style={{ backgroundColor: "#F9FAFB" }}>
      <Card className="w-full max-w-sm p-8 shadow-xl rounded-2xl bg-white border border-gray-200" style={{ backgroundColor: "#ffffff" }}>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#4F46E5]/10">
            <Icon icon="lock" className="h-7 w-7 text-[#4F46E5]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Admin Access</h2>
          <p className="mt-2 text-sm text-gray-500">
            Enter the admin password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-gray-700">Password</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
              className="border-gray-300 bg-white text-gray-900"
            />
          </div>
          <Button type="submit" className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white">
            Unlock
          </Button>
        </form>
      </Card>
    </div>
  );
}
