import { randomUUID } from "node:crypto"

import postgres from "postgres"
import { chromium } from "playwright-core"

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3015"
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5435/weight_tracker"
const AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? ""
const NARROW_VIEWPORT = { width: 360, height: 780 }
const ROUTES = [
  { path: "/sign-in", requiresSession: false },
  { path: "/onboarding", requiresSession: true },
  { path: "/home", requiresSession: true },
]

const failures = []

function report(route, message) {
  failures.push(`${route}: ${message}`)
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

async function createAuthenticatedSession() {
  const sql = postgres(DATABASE_URL, { max: 1 })
  const userId = randomUUID()
  const token = randomUUID()
  const profileId = randomUUID()
  const groupId = randomUUID()
  const inviteToken = randomUUID()

  await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${userId}, ${"Sesión de comprobación"}, ${`${userId}@example.test`}, true, now(), now())`
  await sql`INSERT INTO "session" (id, expires_at, token, created_at, updated_at, user_id)
    VALUES (${randomUUID()}, ${new Date(Date.now() + 3600000)}, ${token}, now(), now(), ${userId})`
  await sql`INSERT INTO profiles (id, user_id, display_name, unit, avatar_emoji, is_dependent, created_at, updated_at)
    VALUES (${profileId}, ${userId}, ${"Nina"}, ${"kg"}, ${"👩"}, false, now(), now())`
  await sql`INSERT INTO profile_managers (profile_id, user_id, created_at)
    VALUES (${profileId}, ${userId}, now())`
  await sql`INSERT INTO groups (id, name, created_by_user_id, timezone, created_at)
    VALUES (${groupId}, ${"Familia"}, ${userId}, ${"UTC"}, now())`
  await sql`INSERT INTO group_memberships (id, group_id, profile_id, role, visibility, ranking_opt_out, joined_at, left_at)
    VALUES (${randomUUID()}, ${groupId}, ${profileId}, ${"owner"}, ${"weight_trend"}, false, now(), null)`
  await sql`INSERT INTO group_settings (group_id, weigh_in_weekday, weigh_in_time, reminders_enabled)
    VALUES (${groupId}, ${0}, null, true)`
  await sql`INSERT INTO can_log_for (group_id, subject_profile_id, logger_profile_id, granted_by_user_id, source)
    VALUES (${groupId}, ${profileId}, ${profileId}, ${userId}, ${"role"})`
  await sql`INSERT INTO invites (id, group_id, kind, token, created_at, revoked_at, expires_at)
    VALUES (${randomUUID()}, ${groupId}, ${"code"}, ${inviteToken}, now(), null, null)`

  await sql.end()

  return { userId, token, groupId, inviteToken }
}

async function removeAuthenticatedSession(userId) {
  const sql = postgres(DATABASE_URL, { max: 1 })

  await sql`DELETE FROM groups WHERE created_by_user_id = ${userId}`
  await sql`DELETE FROM profiles WHERE user_id = ${userId}`
  await sql`DELETE FROM session WHERE user_id = ${userId}`
  await sql`DELETE FROM "user" WHERE id = ${userId}`

  await sql.end()
}

async function collectAccessibleName(page, element) {
  const ariaLabel = await element.getAttribute("aria-label")

  if (ariaLabel?.trim()) {
    return ariaLabel.trim()
  }

  const labelledBy = await element.getAttribute("aria-labelledby")

  if (labelledBy) {
    const labels = await page.locator(labelledBy.split(/\s+/).join(", ")).allTextContents()
    const joined = labels.join(" ").trim()

    if (joined) {
      return joined
    }
  }

  const tagName = await element.evaluate((node) => node.tagName.toLowerCase())

  if (tagName === "input" || tagName === "select" || tagName === "textarea") {
    const id = await element.getAttribute("id")

    if (id) {
      const labels = await page.locator(`label[for="${id}"]`).allTextContents()
      const joined = labels.join(" ").trim()

      if (joined) {
        return joined
      }
    }

    const wrappingLabel = await element.evaluate((node) => node.closest("label")?.textContent ?? "")

    if (wrappingLabel.trim()) {
      return wrappingLabel.trim()
    }

    const placeholder = await element.getAttribute("placeholder")

    return placeholder?.trim() ?? ""
  }

  const text = (await element.textContent())?.trim()

  if (text) {
    return text
  }

  const title = await element.getAttribute("title")

  if (title?.trim()) {
    return title.trim()
  }

  const imageAlt = await element.evaluate(
    (node) => node.querySelector("img")?.getAttribute("alt") ?? "",
  )

  return imageAlt.trim()
}

const { userId, token, groupId, inviteToken } = await createAuthenticatedSession()
const signedToken = await signCookieValue(token)

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  args: ["--no-sandbox"],
})

const routes = [
  ...ROUTES,
  { path: "/groups", requiresSession: true },
  { path: `/groups/${groupId}`, requiresSession: true },
  { path: `/invite/${inviteToken}`, requiresSession: true },
  { path: "/offline", requiresSession: false },
]

try {
  for (const route of routes) {
    const context = await browser.newContext({ viewport: NARROW_VIEWPORT })
    const page = await context.newPage()

    if (route.requiresSession) {
      await context.addCookies([
        {
          name: "weight-tracker.session_token",
          value: signedToken,
          domain: "localhost",
          path: "/",
        },
      ])
    }

    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle" })

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))

    if (overflow.scrollWidth > overflow.clientWidth) {
      report(
        route.path,
        `se desplaza en horizontal (${overflow.scrollWidth}px > ${overflow.clientWidth}px)`,
      )
    }

    const interactiveElements = page.locator(
      "button, a[href], input, select, textarea, [role='button'], [role='link']",
    )
    const interactiveCount = await interactiveElements.count()

    for (let index = 0; index < interactiveCount; index += 1) {
      const element = interactiveElements.nth(index)
      const isInsideDeveloperOverlay = await element.evaluate(
        (node) => node.closest("nextjs-portal") !== null,
      )

      if (isInsideDeveloperOverlay) {
        continue
      }

      const inputType = await element.evaluate((node) =>
        node.tagName.toLowerCase() === "input" ? node.getAttribute("type") : null,
      )

      if (inputType === "hidden") {
        continue
      }

      if (!(await element.isVisible())) {
        continue
      }

      const accessibleName = await collectAccessibleName(page, element)

      if (!accessibleName) {
        const description = await element.evaluate(
          (node) =>
            `${node.tagName.toLowerCase()}${node.className ? `.${String(node.className).split(" ")[0]}` : ""}`,
        )
        report(route.path, `elemento interactivo sin nombre accesible: ${description}`)
      }
    }

    const focusStates = []

    for (let tabIndex = 0; tabIndex < 8; tabIndex += 1) {
      await page.keyboard.press("Tab")
      focusStates.push(
        await page.evaluate(() => {
          const activeElement = document.activeElement

          if (!activeElement || activeElement === document.body) {
            return { hasFocus: false, hasVisibleIndicator: false, isInOverlay: false }
          }

          const styles = window.getComputedStyle(activeElement)
          const hasOutline = styles.outlineStyle !== "none" && styles.outlineWidth !== "0px"
          const hasRing = styles.boxShadow !== "none"

          return {
            hasFocus: true,
            hasVisibleIndicator: hasOutline || hasRing,
            isInOverlay: activeElement.closest("nextjs-portal") !== null,
          }
        }),
      )
    }

    const reachesVisibleControl = focusStates.some(
      (state) => state.hasFocus && !state.isInOverlay && state.hasVisibleIndicator,
    )

    if (!reachesVisibleControl) {
      report(route.path, "el teclado no alcanza ningún control con foco visible")
    }

    await context.close()
  }
} finally {
  await browser.close()
  await removeAuthenticatedSession(userId)
}

if (failures.length > 0) {
  console.error("Fallaron las comprobaciones de interfaz:")
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(
  `Comprobaciones de interfaz correctas en ${routes.map((route) => route.path).join(", ")} a ${NARROW_VIEWPORT.width}px.`,
)
