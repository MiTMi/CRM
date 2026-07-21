"use client";

import * as React from "react";
import { useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/entity-avatar";
import { addComment } from "@/lib/actions/tickets";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ThreadComment {
  id: string;
  authorName: string;
  authorAccent: string;
  body: string;
  createdAt: string;
  pending?: boolean;
}

export function CommentThread({
  ticketId,
  comments,
  currentUser,
}: {
  ticketId: string;
  comments: ThreadComment[];
  currentUser: { name: string; accent: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [value, setValue] = React.useState("");
  const idRef = React.useRef(0);

  const [optimisticComments, addOptimistic] = useOptimistic(
    comments,
    (state, next: ThreadComment) => [...state, next],
  );

  function submit() {
    const body = value.trim();
    if (!body || isPending) return;
    setValue("");
    startTransition(async () => {
      addOptimistic({
        id: `optimistic-${idRef.current++}`,
        authorName: currentUser.name,
        authorAccent: currentUser.accent,
        body,
        createdAt: new Date().toISOString(),
        pending: true,
      });
      const res = await addComment(ticketId, body);
      if (res.ok) {
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to add comment");
        setValue(body); // restore the draft; the optimistic item auto-reverts
      }
    });
  }

  const count = optimisticComments.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="size-4" />
          Activity
          <span className="text-sm font-normal text-muted-foreground">
            · {count} {count === 1 ? "reply" : "replies"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {optimisticComments.length > 0 ? (
          <ol className="space-y-5">
            {optimisticComments.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "flex gap-3 transition-opacity",
                  c.pending && "opacity-60",
                )}
              >
                <EntityAvatar
                  name={c.authorName}
                  accent={c.authorAccent}
                  size="sm"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.pending ? "Sending…" : relativeTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            No replies yet. Start the conversation below.
          </p>
        )}

        <Separator />

        <div className="flex gap-3">
          <EntityAvatar
            name={currentUser.name}
            accent={currentUser.accent}
            size="sm"
          />
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Write a reply or internal note…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={3}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">⌘↵ to send</span>
              <Button size="sm" onClick={submit} disabled={!value.trim()}>
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                Reply
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
