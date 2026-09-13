import { getSetting } from "./queries/content";

type Submission = {
  fullName: string;
  contact: string;
  service?: string;
  message: string;
};

/**
 * Sends the contact-form notification email if the admin has configured
 * email settings (admin → Settings → Email Notifications).
 *
 * Supported providers:
 *  - Resend: set `email_resend_api_key` (re_...)
 *  - Any SMTP (Gmail app password, Outlook, etc.): set `email_smtp_url`
 *    as smtps://user:pass@smtp.host:465 or smtp://user:pass@host:587
 *
 * Required in both cases: `email_notify_to` (recipient address).
 * Optional: `email_from` (defaults differ per provider).
 *
 * Never throws: delivery problems are logged and the submission is still
 * stored in the admin inbox.
 */
export async function sendContactNotification(sub: Submission): Promise<void> {
  const to = (await getSetting("email_notify_to"))?.trim();
  if (!to) return; // not configured — inbox only

  const subject = `New contact form message — ${sub.fullName}`;
  const text = [
    `Name: ${sub.fullName}`,
    `Phone / email: ${sub.contact}`,
    sub.service ? `Service: ${sub.service}` : null,
    "",
    sub.message,
    "",
    "View all messages in the admin panel under Messages.",
  ]
    .filter((l) => l !== null)
    .join("\n");

  const resendKey = (await getSetting("email_resend_api_key"))?.trim();
  const smtpUrl = (await getSetting("email_smtp_url"))?.trim();

  try {
    if (resendKey) {
      const from =
        (await getSetting("email_from"))?.trim() ||
        "OllJira Website <onboarding@resend.dev>";
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, text }),
      });
      if (!resp.ok) {
        console.error("[mail] Resend rejected:", resp.status, await resp.text());
      }
      return;
    }

    if (smtpUrl) {
      const nodemailer = await import("nodemailer");
      const from =
        (await getSetting("email_from"))?.trim() ||
        "OllJira Website <no-reply@olljira.com>";
      const transport = nodemailer.createTransport(smtpUrl);
      await transport.sendMail({ from, to, subject, text });
      return;
    }

    console.warn("[mail] email_notify_to set but no provider configured (resend key or smtp url).");
  } catch (err) {
    console.error("[mail] Failed to send contact notification:", err);
  }
}
