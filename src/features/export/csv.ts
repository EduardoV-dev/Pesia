import type { CsvEntryRow, MemberExport } from "./export-view"

/** RFC 4180 lines end with CRLF so spreadsheet apps accept the file. */
const CSV_LINE_SEPARATOR = "\r\n"

const CSV_HEADER = ["perfil", "día de la pesada", "día del registro", "peso (kg)", "registrada por"]

/** The CSV is the entries slice of the export, one row per entry, with profile names. */
export function buildCsvRows(exportData: MemberExport): CsvEntryRow[] {
  const profileNames = new Map(
    exportData.profiles.map((profile) => [profile.id, profile.displayName]),
  )

  return exportData.entries.map((entry) => ({
    profileName: profileNames.get(entry.profileId) ?? entry.profileId,
    measuredAt: entry.measuredAt,
    recordedAt: entry.recordedAt,
    weightKg: entry.weightKg,
    recordedByName: entry.recordedByName,
  }))
}

export function renderEntriesCsv(rows: readonly CsvEntryRow[]): string {
  const lines = rows.map((row) =>
    [
      row.profileName,
      row.measuredAt,
      row.recordedAt,
      row.weightKg === null ? "" : String(row.weightKg),
      row.recordedByName,
    ]
      .map(escapeCsvValue)
      .join(","),
  )

  return [CSV_HEADER.join(","), ...lines].join(CSV_LINE_SEPARATOR)
}

function escapeCsvValue(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}
