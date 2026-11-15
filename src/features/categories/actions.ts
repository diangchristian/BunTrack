"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/features/activity/log";
import { canAdminister } from "@/features/auth/queries";
import { productStore } from "@/features/products/store";
import { categoryStore } from "./store";
import { categoryLabel } from "./types";

type Result = { ok: true } | { ok: false; error: string };

const labelSchema = z.string().trim().min(1, { error: "Enter a category name" }).max(30, { error: "Keep it under 30 characters" });
const denied: Result = { ok: false, error: "Only an administrator can change categories." };

export async function addCategory(label: string): Promise<Result> {
  if (!(await canAdminister())) return denied;
  const parsed = labelSchema.safeParse(label);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const result = categoryStore.add(parsed.data);
  if (!result.ok) return result;
  await logActivity({ module: "Settings", action: "Category added", record: result.category.label });
  refresh();
  return { ok: true };
}

export async function renameCategory(id: string, label: string): Promise<Result> {
  if (!(await canAdminister())) return denied;
  const parsed = labelSchema.safeParse(label);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const before = categoryLabel(id, categoryStore.list());
  const result = categoryStore.rename(id, parsed.data);
  if (!result.ok) return result;
  if (before !== parsed.data) await logActivity({ module: "Settings", action: "Category renamed", record: parsed.data, change: `${before} → ${parsed.data}` });
  refresh();
  return { ok: true };
}

export async function moveCategory(id: string, direction: -1 | 1): Promise<Result> {
  if (!(await canAdminister())) return denied;
  const result = categoryStore.move(id, direction === -1 ? -1 : 1);
  if (result.ok) refresh(); // order only affects display, so it isn't logged
  return result;
}

export async function deleteCategory(id: string): Promise<Result> {
  if (!(await canAdminister())) return denied;
  const label = categoryLabel(id, categoryStore.list());
  const result = categoryStore.remove(id, productStore.list().filter((p) => p.category === id).length);
  if (!result.ok) return result;
  await logActivity({ module: "Settings", action: "Category deleted", record: label });
  refresh();
  return { ok: true };
}
