/**
 * The one reminder copy builder. Every string a reminder shows (push and email
 * alike) comes from here: a turn and optionally a name — never a weight, a
 * number with a verdict or any health advice (G7, G3, G5).
 */
export type ReminderPayload = {
  readonly subjectProfileId: string
  readonly subjectDisplayName: string | null
}

export type ReminderCopy = {
  readonly title: string
  readonly body: string
  readonly emailSubject: string
  readonly emailBody: string
}

const OWN_TURN_TITLE = "Tu turno de pesada"
const OWN_TURN_BODY = "Es tu turno de pesada. Abrí la app para registrarla."
const OWN_TURN_EMAIL_SUBJECT = OWN_TURN_TITLE
const OWN_TURN_EMAIL_BODY = OWN_TURN_BODY

/** The name arrives only through the per-recipient plan, already visibility-checked. */
export function reminderCopyOf(payload: ReminderPayload): ReminderCopy {
  if (payload.subjectDisplayName === null) {
    return {
      title: OWN_TURN_TITLE,
      body: OWN_TURN_BODY,
      emailSubject: OWN_TURN_EMAIL_SUBJECT,
      emailBody: OWN_TURN_EMAIL_BODY,
    }
  }

  const title = `Es el turno de ${payload.subjectDisplayName}`
  const body = `Es el turno de ${payload.subjectDisplayName}. Abrí la app para registrar su pesada.`

  return {
    title,
    body,
    emailSubject: title,
    emailBody: body,
  }
}
