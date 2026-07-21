import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCurrentUser } from "@/lib/auth/session";
import { getKnowledgeAttachmentRecord } from "@/lib/data/knowledge";
import { UPLOADS_DIR } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const rec = await getKnowledgeAttachmentRecord(id);
  if (!rec) return new Response("Not found", { status: 404 });

  let data: Buffer;
  try {
    data = await readFile(join(UPLOADS_DIR, rec.path));
  } catch {
    return new Response("File missing", { status: 404 });
  }

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": rec.mime,
      "Content-Length": String(rec.size),
      "Content-Disposition": `inline; filename="${encodeURIComponent(rec.filename)}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
