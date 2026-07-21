"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactDialog, type ContactFormValues } from "./contact-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { deleteContact } from "@/lib/actions/customers";

export function ContactRowActions({
  customerId,
  contact,
}: {
  customerId: string;
  contact: ContactFormValues;
}) {
  const name = `${contact.firstName} ${contact.lastName}`.trim();
  return (
    <div className="flex items-center justify-end gap-1">
      <ContactDialog
        mode="edit"
        customerId={customerId}
        contact={contact}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label={`Edit ${name}`}
          >
            <Pencil className="size-4" />
          </Button>
        }
      />
      <ConfirmDelete
        title="Delete contact?"
        description={`This removes ${name} from this customer. Contacts attached to tickets can't be deleted.`}
        successMessage="Contact deleted"
        action={() => deleteContact(contact.id)}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        }
      />
    </div>
  );
}
