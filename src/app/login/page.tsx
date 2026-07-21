import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Headset, ShieldCheck, Ticket, Users } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const DEMO_EMAIL = "sarah.chen@helpdesk.io";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.25), transparent 45%)",
          }}
        />
        <div className="relative flex items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15">
            <Headset className="size-5" />
          </span>
          Helpdesk CRM
        </div>

        <div className="relative mt-auto space-y-6">
          <h2 className="text-3xl font-semibold leading-tight">
            Everything your IT support team needs, in one console.
          </h2>
          <ul className="space-y-3 text-sm text-primary-foreground/90">
            <li className="flex items-center gap-3">
              <Ticket className="size-5 shrink-0" />
              Track and resolve tickets with priorities and SLAs.
            </li>
            <li className="flex items-center gap-3">
              <Users className="size-5 shrink-0" />
              Manage customers, contacts, and accounts.
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-5 shrink-0" />
              Role-based access for admins and technicians.
            </li>
          </ul>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 lg:hidden">
            <div className="flex items-center gap-2 font-semibold">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Headset className="size-5" />
              </span>
              Helpdesk CRM
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your support console.
            </p>
          </div>

          <LoginForm defaultEmail={DEMO_EMAIL} />

          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Demo credentials</p>
            <p className="mt-1">
              <span className="font-mono">{DEMO_EMAIL}</span> (admin) ·{" "}
              <span className="font-mono">marcus.reid@helpdesk.io</span>{" "}
              (technician)
            </p>
            <p className="mt-0.5">
              Password for all accounts:{" "}
              <span className="font-mono">password123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
