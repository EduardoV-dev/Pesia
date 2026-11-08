import "server-only"

import { Resend } from "resend"

import type { ReminderCopy } from "@/features/reminders/copy"

export type EmailSendOutcome = "sent" | "failed"

/**
 * The email fallback for opted-in recipients with no live push subscription.
 * Failures are counted, never retried in-process — tomorrow's scan is the retry.
 */
export async function sendReminderEmail(email: string, copy: ReminderCopy): Promise<EmailSendOutcome> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey || !from) {
    return "failed"
  }

  const resend = new Resend(apiKey)

  try {
    const result = await resend.emails.send({
      from,
      to: email,
      subject: copy.emailSubject,
      text: copy.emailBody,
    })

    if (result.error) {
      return "failed"
    }
  } catch {
    return "failed"
  }

  return "sent"
}
