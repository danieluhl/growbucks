// Secrets aren't in wrangler.jsonc, so `wrangler types` can't see them.
declare namespace Cloudflare {
  interface Env {
    RESEND_API_KEY?: string
  }
}
