import { env } from "cloudflare:workers"

/**
 * Send a parent their sign-in code. Uses Resend's HTTP API when
 * RESEND_API_KEY is set; otherwise prints the code to the dev console so
 * local sign-in works with no email setup.
 */
export async function sendLoginCode(email: string, code: string) {
  if (!env.RESEND_API_KEY) {
    console.info(`[dev] GrowBucks sign-in code for ${email}: ${code}`)
    return
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: email,
      subject: `${code} is your GrowBucks code`,
      text: `Your GrowBucks sign-in code is ${code}. It works for 10 minutes.\n\nIf you didn't ask for this, you can ignore this email.`,
    }),
  })
  if (!res.ok) throw new Error(`Email send failed: ${res.status}`)
}
