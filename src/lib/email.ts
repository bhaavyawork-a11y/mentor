import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Mentor <hello@mentorapp.in>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mentorapp.in";

// ─── Brand colours ────────────────────────────────────────────────────────────
const GREEN  = "#0A3323";
const SAGE   = "#839958";
const CREAM  = "#F7F4D5";
const SALMON = "#D3968C";

// ─── Shared layout wrapper ────────────────────────────────────────────────────
function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>mentor.</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ea;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e4ce;">
        <!-- Header -->
        <tr>
          <td style="background:${GREEN};padding:22px 32px;">
            <span style="font-size:20px;font-weight:800;color:${CREAM};letter-spacing:-0.5px;">
              mentor<span style="color:${SALMON};">.</span>
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#faf8f0;padding:20px 32px;border-top:1px solid #e8e4ce;">
            <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
              You're receiving this because you have an account on
              <a href="${APP_URL}" style="color:${SAGE};text-decoration:none;">mentor.</a>
              · <a href="${APP_URL}/settings" style="color:${SAGE};text-decoration:none;">Manage notifications</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string, primary = true): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;background:${primary ? GREEN : CREAM};color:${primary ? SAGE : GREEN};">${label}</a>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${GREEN};">${text}</h1>`;
}
function p(text: string, small = false): string {
  return `<p style="margin:0 0 16px;font-size:${small ? 12 : 14}px;color:${small ? "#888" : "#333"};line-height:1.6;">${text}</p>`;
}
function divider(): string {
  return `<div style="border-top:1px solid #e8e4ce;margin:24px 0;"></div>`;
}
function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:12px;color:#888;width:140px;">${label}</td>
    <td style="padding:8px 0;font-size:13px;color:#1a1a1a;font-weight:600;">${value}</td>
  </tr>`;
}

// ─── Email 1: User booking confirmation (payment received) ────────────────────
export async function sendBookingConfirmedToUser(opts: {
  to: string;
  userName: string;
  expertName: string;
  serviceTitle: string;
  durationMins: number;
  amountInr: string;
  scheduledAt?: string;
  meetingUrl?: string;
  bookingId: string;
}) {
  const { to, userName, expertName, serviceTitle, durationMins, amountInr, scheduledAt, meetingUrl, bookingId } = opts;

  const dateStr = scheduledAt
    ? new Date(scheduledAt).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
      " at " + new Date(scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "Time to be confirmed by expert";

  const html = layout(`
    ${h1("Your booking is confirmed ✅")}
    ${p(`Hey ${userName.split(" ")[0]}, you're all set! Your session with <strong>${expertName}</strong> has been booked and payment received.`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0" width="100%">
      ${infoRow("Expert", expertName)}
      ${infoRow("Service", serviceTitle)}
      ${infoRow("Duration", `${durationMins} min`)}
      ${infoRow("Amount paid", amountInr)}
      ${infoRow("Session time", dateStr)}
    </table>
    ${divider()}
    ${meetingUrl
      ? `${p("Your Google Meet link is ready:")}${btn(meetingUrl, "📹 Join call")} `
      : `${p("Your expert will share a Google Meet link once the session is scheduled.", true)}`
    }
    <div style="height:16px;"></div>
    ${btn(`${APP_URL}/experts`, "View my bookings", false)}
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Booking confirmed: ${serviceTitle} with ${expertName}`,
    html,
  });
}

// ─── Email 2: Expert gets notified of new booking ─────────────────────────────
export async function sendNewBookingToExpert(opts: {
  to: string;
  expertName: string;
  userName: string;
  serviceTitle: string;
  durationMins: number;
  amountInr: string;
  userNote?: string;
  bookingId: string;
}) {
  const { to, expertName, userName, serviceTitle, durationMins, amountInr, userNote, bookingId } = opts;

  const html = layout(`
    ${h1("New booking received 🎉")}
    ${p(`Hey ${expertName.split(" ")[0]}, <strong>${userName}</strong> has booked your <strong>${serviceTitle}</strong>.`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0" width="100%">
      ${infoRow("From", userName)}
      ${infoRow("Service", serviceTitle)}
      ${infoRow("Duration", `${durationMins} min`)}
      ${infoRow("You earn", amountInr)}
    </table>
    ${userNote ? `${divider()}${p(`<em>"${userNote}"</em>`, true)}` : ""}
    ${divider()}
    ${p("Head to your dashboard to confirm the booking and schedule a time.")}
    ${btn(`${APP_URL}/expert-dashboard/bookings`, "View in dashboard")}
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `New booking from ${userName}: ${serviceTitle}`,
    html,
  });
}

// ─── Email 3: Session confirmed by expert (with meet link) ────────────────────
export async function sendSessionConfirmedToUser(opts: {
  to: string;
  userName: string;
  expertName: string;
  serviceTitle: string;
  scheduledAt?: string;
  meetingUrl?: string;
}) {
  const { to, userName, expertName, serviceTitle, scheduledAt, meetingUrl } = opts;

  const dateStr = scheduledAt
    ? new Date(scheduledAt).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) +
      " at " + new Date(scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "Time TBD";

  const html = layout(`
    ${h1("Your session is on 📅")}
    ${p(`${expertName} has confirmed your session. Here's everything you need:`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0" width="100%">
      ${infoRow("Expert", expertName)}
      ${infoRow("Session", serviceTitle)}
      ${infoRow("When", dateStr)}
    </table>
    ${divider()}
    ${meetingUrl
      ? `${p("Join with this link at the scheduled time:")}<div style="background:#f5f3ea;border-radius:10px;padding:16px;margin-bottom:20px;"><a href="${meetingUrl}" style="color:${GREEN};font-size:13px;font-weight:700;word-break:break-all;">${meetingUrl}</a></div>${btn(meetingUrl, "📹 Join Google Meet")}`
      : `${p("Your Google Meet link will appear here once your expert sets it up.", true)}`
    }
    <div style="height:16px;"></div>
    <p style="margin:0;font-size:12px;color:#888;">
      Tip: Come prepared with 2–3 specific questions to get the most out of your session.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Session confirmed with ${expertName} — ${dateStr}`,
    html,
  });
}

// ─── Email 4: Session completed — ask for a review ───────────────────────────
export async function sendSessionCompletedToUser(opts: {
  to: string;
  userName: string;
  expertName: string;
  serviceTitle: string;
  expertId: string;
}) {
  const { to, userName, expertName, serviceTitle, expertId } = opts;

  const html = layout(`
    ${h1("How was your session? ⭐")}
    ${p(`Hey ${userName.split(" ")[0]}, your <strong>${serviceTitle}</strong> with <strong>${expertName}</strong> is marked as complete. Hope it was valuable!`)}
    ${divider()}
    ${p("Your feedback helps other early-career folks find the right mentors. Takes 30 seconds.")}
    ${btn(`${APP_URL}/experts/${expertId}?review=1`, "Leave a review")}
    ${divider()}
    ${p("Want to book another session?", true)}
    ${btn(`${APP_URL}/experts`, "Browse experts", false)}
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `How was your session with ${expertName}?`,
    html,
  });
}

// ─── Email 5: Welcome email on sign up ───────────────────────────────────────
export async function sendWelcomeEmail(opts: {
  to: string;
  userName: string;
}) {
  const { to, userName } = opts;
  const firstName = userName.split(" ")[0];

  const html = layout(`
    ${h1(`Welcome, ${firstName} 👋`)}
    ${p("You've joined Mentor — the community for early-career professionals in India figuring out the side door.")}
    ${divider()}
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0efe8;">
          <span style="font-size:18px;">👥</span>&nbsp;&nbsp;
          <strong style="font-size:13px;color:#1a1a1a;">Join your community</strong>
          <p style="margin:4px 0 0 30px;font-size:12px;color:#888;">Product, Engineering, Finance, Consulting — find your people.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0efe8;">
          <span style="font-size:18px;">✨</span>&nbsp;&nbsp;
          <strong style="font-size:13px;color:#1a1a1a;">Try the AI assistant</strong>
          <p style="margin:4px 0 0 30px;font-size:12px;color:#888;">Get real answers on salary negotiation, offer evaluation, and career moves.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;">
          <span style="font-size:18px;">📅</span>&nbsp;&nbsp;
          <strong style="font-size:13px;color:#1a1a1a;">Book time with an expert</strong>
          <p style="margin:4px 0 0 30px;font-size:12px;color:#888;">1:1 coaching, mock interviews, resume reviews — from people who've been there.</p>
        </td>
      </tr>
    </table>
    ${divider()}
    ${btn(`${APP_URL}/welcome`, "Set up your profile →")}
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to Mentor, ${firstName} 🎉`,
    html,
  });
}

// ─── Email 6: Payout requested confirmation to expert ────────────────────────
export async function sendPayoutRequestedToExpert(opts: {
  to: string;
  expertName: string;
  amountInr: string;
  method: string;
  payoutId: string;
}) {
  const { to, expertName, amountInr, method } = opts;

  const html = layout(`
    ${h1("Payout request received 💸")}
    ${p(`Hey ${expertName.split(" ")[0]}, we've received your payout request and will process it within 3–5 business days.`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0" width="100%">
      ${infoRow("Amount", amountInr)}
      ${infoRow("Method", method === "upi" ? "UPI" : "Bank transfer")}
      ${infoRow("Status", "Processing")}
      ${infoRow("Expected", "3–5 business days")}
    </table>
    ${divider()}
    ${p("We'll email you again when the transfer is complete.", true)}
    ${btn(`${APP_URL}/expert-dashboard/earnings`, "View earnings")}
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Payout of ${amountInr} is being processed`,
    html,
  });
}
