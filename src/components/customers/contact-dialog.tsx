"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContact, updateContact } from "@/lib/actions/customers";

export interface ContactFormValues {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isPrimary: boolean;
}

export function ContactDialog({
  mode,
  customerId,
  contact,
  trigger,
}: {
  mode: "create" | "edit";
  customerId: string;
  contact?: ContactFormValues;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const [firstName, setFirstName] = React.useState(contact?.firstName ?? "");
  const [lastName, setLastName] = React.useState(contact?.lastName ?? "");
  const [email, setEmail] = React.useState(contact?.email ?? "");
  const [phone, setPhone] = React.useState(contact?.phone ?? "");
  const [role, setRole] = React.useState(contact?.role ?? "");
  const [isPrimary, setIsPrimary] = React.useState(contact?.isPrimary ?? false);

  function reset() {
    if (mode === "edit" && contact) {
      setFirstName(contact.firstName);
      setLastName(contact.lastName);
      setEmail(contact.email);
      setPhone(contact.phone);
      setRole(contact.role);
      setIsPrimary(contact.isPrimary);
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setRole("");
      setIsPrimary(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { firstName, lastName, email, phone, role: role || "Contact", isPrimary };
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createContact(customerId, payload)
          : await updateContact(contact!.id, payload);
      if (res.ok) {
        setOpen(false);
        if (mode === "create") reset();
        toast.success(mode === "create" ? "Contact added" : "Contact updated");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            Add contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Add contact" : "Edit contact"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Add a person at this customer."
                : "Update this contact's details."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ct-first">First name</Label>
                <Input
                  id="ct-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ct-last">Last name</Label>
                <Input
                  id="ct-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ct-email">Email</Label>
              <Input
                id="ct-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ct-phone">Phone</Label>
                <Input
                  id="ct-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ct-role">Role</Label>
                <Input
                  id="ct-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="IT Manager"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="size-4 accent-primary"
              />
              Set as primary contact
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Add contact" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
