"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import { SLA_TIERS, SLA_TIER_ORDER } from "@/lib/data/sla";
import type { CustomerTier } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export interface CustomerFormValues {
  id?: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  location: string;
  status: "active" | "inactive";
  slaTier: CustomerTier;
}

export function CustomerDialog({
  mode,
  customer,
  trigger,
}: {
  mode: "create" | "edit";
  customer?: CustomerFormValues;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const [name, setName] = React.useState(customer?.name ?? "");
  const [industry, setIndustry] = React.useState(customer?.industry ?? "");
  const [website, setWebsite] = React.useState(customer?.website ?? "");
  const [phone, setPhone] = React.useState(customer?.phone ?? "");
  const [location, setLocation] = React.useState(customer?.location ?? "");
  const [status, setStatus] = React.useState<"active" | "inactive">(
    customer?.status ?? "active",
  );
  const [slaTier, setSlaTier] = React.useState<CustomerTier>(
    customer?.slaTier ?? "standard",
  );
  // create-only primary contact
  const [cFirst, setCFirst] = React.useState("");
  const [cLast, setCLast] = React.useState("");
  const [cEmail, setCEmail] = React.useState("");

  function resetForEdit() {
    setName(customer?.name ?? "");
    setIndustry(customer?.industry ?? "");
    setWebsite(customer?.website ?? "");
    setPhone(customer?.phone ?? "");
    setLocation(customer?.location ?? "");
    setStatus(customer?.status ?? "active");
    setSlaTier(customer?.slaTier ?? "standard");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (mode === "create") {
        const res = await createCustomer({
          name,
          industry,
          website,
          phone,
          location,
          status,
          slaTier,
          contactFirstName: cFirst,
          contactLastName: cLast,
          contactEmail: cEmail,
          contactRole: "Primary Contact",
        });
        if (res.ok) {
          setOpen(false);
          toast.success(`${name} added`);
          router.push(`/customers/${res.data.id}`);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await updateCustomer(customer!.id!, {
          name,
          industry,
          website,
          phone,
          location,
          status,
          slaTier,
        });
        if (res.ok) {
          setOpen(false);
          toast.success("Customer updated");
          router.refresh();
        } else {
          toast.error(res.error);
        }
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v && mode === "edit") resetForEdit();
      }}
    >
      <DialogTrigger asChild>
        {trigger ??
          (mode === "create" ? (
            <Button size="sm">
              <Plus className="size-4" />
              New Customer
            </Button>
          ) : (
            <Button size="sm" variant="outline">
              <Pencil className="size-4" />
              Edit
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "New customer" : "Edit customer"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Add a company and its primary contact."
                : "Update this customer's details."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <div className="grid gap-2">
              <Label htmlFor="c-name">Company name</Label>
              <Input
                id="c-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corporation"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="c-industry">Industry</Label>
                <Input
                  id="c-industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Technology"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-location">Location</Label>
                <Input
                  id="c-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="San Francisco, CA"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-website">Website</Label>
                <Input
                  id="c-website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="acme.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-phone">Phone</Label>
                <Input
                  id="c-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (415) 555-0100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as "active" | "inactive")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Service tier (SLA)</Label>
                <Select
                  value={slaTier}
                  onValueChange={(v) => setSlaTier(v as CustomerTier)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLA_TIER_ORDER.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        <span
                          className={cn("size-1.5 rounded-full", SLA_TIERS[tier].dot)}
                        />
                        {SLA_TIERS[tier].label}
                        <span className="text-xs text-muted-foreground">
                          {SLA_TIERS[tier].blurb}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {mode === "create" && (
              <>
                <Separator />
                <p className="text-sm font-medium">Primary contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="c-first">First name</Label>
                    <Input
                      id="c-first"
                      value={cFirst}
                      onChange={(e) => setCFirst(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="c-last">Last name</Label>
                    <Input
                      id="c-last"
                      value={cLast}
                      onChange={(e) => setCLast(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 grid gap-2">
                    <Label htmlFor="c-email">Contact email</Label>
                    <Input
                      id="c-email"
                      type="email"
                      value={cEmail}
                      onChange={(e) => setCEmail(e.target.value)}
                      placeholder="contact@acme.com"
                      required
                    />
                  </div>
                </div>
              </>
            )}
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
              {mode === "create" ? "Create customer" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
