"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "../actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, {});

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-sm font-semibold text-muted-foreground">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          defaultValue={state.email}
          aria-invalid={!!state.errors?.email}
          aria-describedby={state.errors?.email ? "email-error" : undefined}
          className="h-11 px-3"
          required
        />
        {state.errors?.email && (
          <p id="email-error" className="text-xs text-destructive">
            {state.errors.email[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-sm font-semibold text-muted-foreground">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!state.errors?.password}
          aria-describedby={state.errors?.password ? "password-error" : undefined}
          className="h-11 px-3"
          required
        />
        {state.errors?.password && (
          <p id="password-error" className="text-xs text-destructive">
            {state.errors.password[0]}
          </p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-11 text-sm font-semibold">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
