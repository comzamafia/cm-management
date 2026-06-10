"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CURRENT_USER_COOKIE } from "./auth";

/** Phase 1: pick which seeded user you're acting as (stands in for login). */
export async function setCurrentUser(userId: string) {
  const store = await cookies();
  store.set(CURRENT_USER_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}
