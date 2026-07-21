"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export interface LoginState {
  error?: string;
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const row = await queryOne<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM technicians WHERE lower(email) = lower(?)",
    [parsed.data.email],
  );

  // Same message whether the account is missing or the password is wrong.
  if (!row || !verifyPassword(parsed.data.password, row.password_hash)) {
    return { error: "Incorrect email or password" };
  }

  await createSession(row.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
