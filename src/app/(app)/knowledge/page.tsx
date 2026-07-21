import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { KnowledgeList } from "@/components/knowledge/knowledge-list";
import { NoteDialog } from "@/components/knowledge/note-dialog";
import {
  getKnowledgeNotes,
  getDeletedKnowledgeNotes,
} from "@/lib/data/knowledge";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Knowledge" };
export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  const [notes, deletedNotes] = await Promise.all([
    getKnowledgeNotes(),
    isAdmin ? getDeletedKnowledgeNotes() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge"
        description="Team notes, ideas, and how-tos — with documents and images."
        actions={<NoteDialog mode="create" />}
      />
      <KnowledgeList
        notes={notes}
        deletedNotes={deletedNotes}
        isAdmin={isAdmin}
      />
    </div>
  );
}
