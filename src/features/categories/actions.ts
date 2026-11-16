"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/features/activity/log";
import { canAdminister } from "@/features/auth/queries";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { productCountsByCategory } from "./queries";
import { addError, categoryIdFor, removeError, renameError, swapWithNeighbour } from "./rules";

type Result = { ok: true } | { ok: false; error: string };

const labelSchema = z.string().trim().min(1, { error: "Enter a category name" }).max(30, { error: "Keep it under 30 characters" });
const denied: Result = { ok: false, error: "Only an administrator can change categories." };

const allCategories = () => db.category.findMany({ orderBy: { position: "asc" } });

export async function addCategory(label: string): Promise<Result> {
  if (!(await canAdminister())) return denied;
  const parsed = labelSchema.safeParse(label);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const categories = await allCategories();
  const error = addError(parsed.data, categories);
  if (error) return { ok: false, error };
  // New categories go last.
  const position = (categories.at(-1)?.position ?? -1) + 1;
  try {
    await db.category.create({ data: { id: categoryIdFor(parsed.data, categories), label: parsed.data, position } });
  } catch (e) {
    // Two admins adding the same name at the same moment: the id is taken by the other one.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "There's already a category called that." };
    throw e;
  }
  await logActivity({ module: "Settings", action: "Category added", record: parsed.data });
  refresh();
  return { ok: true };
}

export async function renameCategory(id: string, label: string): Promise<Result> {
  if (!(await canAdminister())) return denied;
  const parsed = labelSchema.safeParse(label);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const categories = await allCategories();
  const error = renameError(id, parsed.data, categories);
  if (error) return { ok: false, error };
  const before = categories.find((c) => c.id === id)!.label;
  if (before === parsed.data) return { ok: true };
  await db.category.update({ where: { id }, data: { label: parsed.data } });
  await logActivity({ module: "Settings", action: "Category renamed", record: parsed.data, change: `${before} → ${parsed.data}` });
  refresh();
  return { ok: true };
}

export async function moveCategory(id: string, direction: -1 | 1): Promise<Result> {
  if (!(await canAdminister())) return denied;
  const swap = swapWithNeighbour(id, direction === -1 ? -1 : 1, await allCategories());
  if (!swap) return { ok: false, error: "It can't move further that way." };
  // Both positions change together, so the list is never left with a gap or a duplicate.
  await db.$transaction(swap.map(({ id, position }) => db.category.update({ where: { id }, data: { position } })));
  refresh(); // order only affects display, so it isn't logged
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<Result> {
  if (!(await canAdminister())) return denied;
  const [categories, counts] = await Promise.all([allCategories(), productCountsByCategory()]);
  const error = removeError(id, counts[id] ?? { active: 0, archived: 0 }, categories);
  if (error) return { ok: false, error };
  await db.category.delete({ where: { id } });
  await logActivity({ module: "Settings", action: "Category deleted", record: categories.find((c) => c.id === id)!.label });
  refresh();
  return { ok: true };
}
