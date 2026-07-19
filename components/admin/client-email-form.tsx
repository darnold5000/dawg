"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ClientEmailForm({
  parentId,
  parentEmail,
  defaultSubject = "Message from DAWG Youth Training",
}: {
  parentId: string;
  parentEmail: string;
  defaultSubject?: string;
}) {
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Enter a message");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/admin/clients/${parentId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not send email");
        return;
      }
      toast.success(`Email sent to ${parentEmail}`);
      setMessage("");
    } catch {
      toast.error("Could not send email");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email-subject">Subject</Label>
        <Input
          id="email-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          maxLength={160}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email-message">Message</Label>
        <Textarea
          id="email-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
          maxLength={4000}
          placeholder="Write a note to this parent…"
        />
      </div>
      <Button
        type="submit"
        disabled={sending}
        className="bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {sending ? "Sending…" : "Send email"}
      </Button>
    </form>
  );
}
