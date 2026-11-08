/**
 * The task 7.2 device pass: a real browser opts in through the group settings
 * toggle, a real subscription lands in the dev database, the cron scan sends a
 * REAL push, and the service worker shows the Spanish copy with no weight.
 * Seeds its own family, cleans up after itself.
 */
import { randomUUID } from "node:crypto"

import { rmSync } from "node:fs"

import postgres from "postgres"
import { chromium } from "playwright-core"

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3015"
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5435/weight_tracker"
const AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? ""
const CRON_SECRET = process.env.CRON_SECRET ?? ""

const failures = []

function fail(message) {
  failures.push(message)
}

async function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`)
  } else {
    fail(message)
  }
}

async function signCookieValue(value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))

  return encodeURIComponent(`${value}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`)
}

if (!AUTH_SECRET || !CRON_SECRET) {
  console.error("✗ faltan BETTER_AUTH_SECRET o CRON_SECRET en el entorno")

  process.exit(1)
}

/** A timezone whose local hour is inside the scan window right now. */
function pickTimezoneInWindow() {
  for (let offset = 0; offset <= 13; offset += 1) {
    const timeZone = `Etc/GMT-${offset}`
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", { timeZone, hourCycle: "h23", hour: "2-digit" }).format(new Date()),
    )

    if (hour >= 7 && hour < 12) {
      return timeZone
    }
  }

  fail("ninguna zona horaria de prueba cae dentro de la ventana de escaneo")

  return "UTC"
}

async function seedFamily() {
  const sql = postgres(DATABASE_URL, { max: 1 })
  const userId = randomUUID()
  const token = randomUUID()
  const profileId = randomUUID()
  const groupId = randomUUID()
  const entryId = randomUUID()
  const stale = new Date(Date.now() - 8 * 86_400_000)

  await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${userId}, ${"Nina de comprobación"}, ${`${userId}@example.test`}, true, now(), now())`
  await sql`INSERT INTO "session" (id, expires_at, token, created_at, updated_at, user_id)
    VALUES (${randomUUID()}, ${new Date(Date.now() + 3600000)}, ${token}, now(), now(), ${userId})`
  await sql`INSERT INTO profiles (id, user_id, display_name, unit, avatar_emoji, is_dependent, created_at, updated_at)
    VALUES (${profileId}, ${userId}, ${"Nina"}, ${"kg"}, ${"👩"}, false, now(), now())`
  await sql`INSERT INTO profile_managers (profile_id, user_id, created_at)
    VALUES (${profileId}, ${userId}, now())`
  await sql`INSERT INTO groups (id, name, created_by_user_id, timezone, created_at)
    VALUES (${groupId}, ${"Familia de comprobación"}, ${userId}, ${pickTimezoneInWindow()}, now())`
  await sql`INSERT INTO group_memberships (id, group_id, profile_id, role, visibility, ranking_opt_out, joined_at, left_at)
    VALUES (${randomUUID()}, ${groupId}, ${profileId}, ${"owner"}, ${"weight_trend"}, false, now(), null)`
  await sql`INSERT INTO group_settings (group_id, weigh_in_weekday, weigh_in_time, reminders_enabled)
    VALUES (${groupId}, ${0}, null, true)`
  await sql`INSERT INTO can_log_for (group_id, subject_profile_id, logger_profile_id, granted_by_user_id, source)
    VALUES (${groupId}, ${profileId}, ${profileId}, ${userId}, ${"role"})`
  await sql`INSERT INTO entries (id, profile_id, group_id, weight_kg, measured_at, recorded_at, recorded_by_user_id, recorded_by_name)
    VALUES (${entryId}, ${profileId}, ${groupId}, 70.00, ${stale}, now(), ${userId}, ${"Nina"})`

  return { userId, token, groupId, profileId }
}

async function cleanupFamily(userId, groupId) {
  const sql = postgres(DATABASE_URL, { max: 1 })

  await sql`DELETE FROM groups WHERE id = ${groupId}`
  await sql`DELETE FROM push_opt_ins WHERE user_id = ${userId}`
  await sql`DELETE FROM push_subscriptions WHERE user_id = ${userId}`
  await sql`DELETE FROM session WHERE user_id = ${userId}`
  await sql`DELETE FROM "user" WHERE id = ${userId}`
}

async function runScan() {
  const response = await fetch(`${BASE_URL}/api/cron/reminder-scan`, {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  })

  return { response, body: await response.json() }
}

const { userId, token, groupId } = await seedFamily()
const signedToken = await signCookieValue(token)

// A persistent profile, not an incognito-style context: Chrome deliberately
// disables the Push API in incognito and there is no feature-detect.
const PROFILE_DIR = "/tmp/opencode/device-pass-profile"
rmSync(PROFILE_DIR, { recursive: true, force: true })

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  viewport: { width: 360, height: 780 },
  args: ["--no-sandbox", "--allow-http-notification-permission-without-https"],
})

try {
  await context.grantPermissions(["notifications"], { origin: BASE_URL })
  context.on("response", (response) => {
    if (response.url().includes("push") || response.url().includes("action")) {
      console.log(`plumb ${response.request().method()} ${response.url()} → ${response.status()}`)
    }
  })

  const page = await context.newPage()

  page.on("response", (response) => {
    const url = response.url()

    if (url.includes("push") || url.includes("subscriptions") || response.status() >= 400) {
      console.log(`plumb ${response.request().method()} ${url.split("?")[0]} → ${response.status()}`)
    }
  })

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      console.log(`plumb console ${message.type()}: ${message.text().slice(0, 240)}`)
    }
  })
  page.on("pageerror", (error) => {
    console.log(`plumb pageerror: ${String(error).slice(0, 240)}`)
  })

  await context.addCookies([
    { name: "weight-tracker.session_token", value: signedToken, domain: "localhost", path: "/" },
  ])
  await page.goto(`${BASE_URL}/groups/${groupId}`, { waitUntil: "networkidle" })

  const toggle = page.getByText("Avisame cuando sea el turno de alguien")

  await assert((await toggle.count()) === 1, "la section de recordatorios aparece en los ajustes")
  const toggleCheckbox = page.locator('label', { hasText: "Avisame cuando sea el turno de alguien" }).locator('input[type="checkbox"]')

  // Playwright may click before React hydrates: the flip then lands nowhere.
  await page.waitForFunction(
    () => {
      const input = [
        ...document.querySelectorAll('label input[type="checkbox"]'),
      ].find(() => true)

      return Boolean(input && Object.keys(input).some((key) => key.startsWith("__reactProps")))
    },
    null,
    { timeout: 20000 },
  )

  await toggleCheckbox.click()
  const subscriptionFound = await page
    .waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration()

      if (!registration) {
        return false
      }

      const subscription = await registration.pushManager.getSubscription()

      return Boolean(subscription?.endpoint)
    }, null, { timeout: 15000 })
    .then(
      () => true,
      () => false,
    )

  console.log(`plumb subscription wait: ${subscriptionFound ? "found" : "TIMEOUT"}`)

  await page.evaluate(async () => {
    const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.ready)
    const subscription = await registration.pushManager.getSubscription()

    console.log(`plumb endpoint right after click: ${subscription?.endpoint ?? "none"}`)
  })

  const beforeReload = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    const registrationList = await navigator.serviceWorker.getRegistrations()
    const subscription = registration ? await registration.pushManager.getSubscription() : null

    return {
      registrations: registrationList.map((value) => value.scope),
      endpoint: subscription?.endpoint ?? null,
      keysPresent: Boolean(subscription?.getKey("p256dh") && subscription?.getKey("auth")),
    }
  })

  console.log("plumb before reload:", JSON.stringify(beforeReload))

  const diagnostics = await page.evaluate(async () => ({
    alerts: [...document.querySelectorAll("[role='alert']")].map((node) => node.textContent),
    bodyText: document.body.innerText.slice(0, 900),
  }))

  console.log("plumb after click:", JSON.stringify(diagnostics, null, 2))

  await page.waitForTimeout(2500)

  // Reload and read the server truth back: the consent must survive.
  await page.reload({ waitUntil: "networkidle" })

  const afterReload = await page.evaluate(async () => {
    const subscription = (await navigator.serviceWorker.getRegistration())
      ? (await (await navigator.serviceWorker.getRegistration()).pushManager.getSubscription())
      : null

    return { endpoint: subscription?.endpoint ?? null }
  })

  console.log("plumb after reload:", JSON.stringify(afterReload))

  const checked = await page
    .locator('label', { hasText: "Avisame cuando sea el turno de alguien" })
    .locator('input[type="checkbox"]')
    .isChecked()

  await assert(checked, "the opt-in persists after a reload")

  const subscription = await page.evaluate(() =>
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((value) => (value ? { endpoint: value.endpoint.split("/").pop() } : null)),
  )

  await assert(subscription !== null, "the device holds a real web-push subscription")

  const { response, body } = await runScan()

  await assert(response.ok, "the cron scan accepted the secret")
  await assert(body.counts?.pushesSent >= 1, `el escaneo envió un empuje real (${JSON.stringify(body.counts)})`)

  // The push service delivers async: poll the registration's active notifications.
  let notifications = []
  for (let attempt = 0; attempt < 20; attempt += 1) {
    notifications = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      const list = await registration.getNotifications()

      return list.map((notification) => ({
        title: notification.title,
        body: notification.body,
      }))
    })

    if (notifications.length > 0) {
      break
    }

    await page.waitForTimeout(1000)
  }

  await assert(notifications.length > 0, "la notificación del recordatorio llegó al dispositivo")
  await assert(
    notifications.some((item) => item.title === "Tu turno de pesada"),
    `el título es español del propio turno (${notifications.map((item) => item.title).join(", ")})`,
  )
  await assert(
    notifications.every((item) => !/\d/.test(item.body)),
    `la copia no trae números de ningún tipo (${notifications.map((item) => item.body).join(" | ")})`,
  )
} finally {
  await cleanupFamily(userId, groupId)
  await context.close()
}

if (failures.length > 0) {
  for (const message of failures) {
    console.error(`✗ ${message}`)
  }

  process.exit(1)
}

console.log("Recorrido del dispositivo completo.")
