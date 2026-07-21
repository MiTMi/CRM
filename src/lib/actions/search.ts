"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { searchWorkspace } from "@/lib/data/repository";
import type { WorkspaceSearchResults } from "@/lib/data/types";

const EMPTY: WorkspaceSearchResults = {
  tickets: [],
  customers: [],
  technicians: [],
  knowledge: [],
};

/** Server-side workspace search for the command palette. */
export async function searchWorkspaceAction(
  query: string,
): Promise<WorkspaceSearchResults> {
  // Only signed-in users can search the workspace.
  const user = await getCurrentUser();
  if (!user) return EMPTY;
  return searchWorkspace(query);
}
