import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    setBusy(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo:
          "https://roadrescue-liard.vercel.app/reset-password",
      }
    );

    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password reset instructions have been sent to your email.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleReset}
        className="card-surface w-full max-w-md space-y-5 p-8"
      >
        <div>
          <h1 className="text-2xl font-extrabold">
            Forgot your password?
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email address and we'll send you a password reset link.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>

          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={busy}
        >
          {busy ? "Sending..." : "Send reset link"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link
            to="/auth"
            className="font-semibold text-primary"
          >
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
