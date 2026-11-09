import { NextResponse } from "next/server"

import { auth } from "@/auth/auth"
import { buildCsvRows, renderEntriesCsv } from "@/features/export/csv"
import { collectMemberExport } from "@/features/export/server/collect-export"
import { apiFailure, API_UNAUTHORIZED_MESSAGE } from "@/lib/api-response"

const INVALID_FORMAT_MESSAGE = "El formato de exportación no existe."

/**
 * The member's own export as a file download. The file body is the export
 * document itself — a download keeps its protocol-defined format, so the JSON
 * envelope does not apply here. The session is read per-request (never through
 * `next/headers`) so the handler stays callable outside the framework.
 */
export async function GET(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json(
      apiFailure([{ code: "unauthorized", message: API_UNAUTHORIZED_MESSAGE }], API_UNAUTHORIZED_MESSAGE),
      { status: 401 },
    )
  }

  const format = new URL(request.url).searchParams.get("format")

  if (format !== "json" && format !== "csv") {
    return NextResponse.json(
      apiFailure([{ code: "invalid_input", message: INVALID_FORMAT_MESSAGE }], INVALID_FORMAT_MESSAGE),
      { status: 400 },
    )
  }

  const exportData = await collectMemberExport({ userId: session.user.id })

  if (format === "csv") {
    return new NextResponse(renderEntriesCsv(buildCsvRows(exportData)), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="mis-pesadas.csv"',
      },
    })
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="mis-datos.json"',
    },
  })
}
