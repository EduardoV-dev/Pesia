const textEncoder = new TextEncoder()

async function signCookieValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )

  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value))
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))

  return encodeURIComponent(`${value}.${base64Signature}`)
}

export async function createSessionCookieHeader(
  token: string,
  cookieName = "weight-tracker.session_token",
  secret = process.env.BETTER_AUTH_SECRET ?? "",
): Promise<Headers> {
  const signedValue = await signCookieValue(token, secret)

  return new Headers({ cookie: `${cookieName}=${signedValue}` })
}
