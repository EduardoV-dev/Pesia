import { notFound } from "next/navigation"

import { assembleGroupBoard } from "@/features/board/server/assemble-board"
import { setClaimPublicationFormAction } from "@/features/awards/server/award-actions"
import { BoardPage } from "@/features/board/pages/board-page"
import { requireActingProfile } from "@/features/groups/server/acting-profile"

export const instant = false

export default async function BoardPageRoute({
  params,
}: Readonly<{
  params: Promise<{ groupId: string }>
}>) {
  const { userId, profileId } = await requireActingProfile()
  const { groupId } = await params

  const board = await assembleGroupBoard({
    groupId,
    viewerProfileId: profileId,
    viewerUserId: userId,
  })

  if (!board) {
    notFound()
  }

  return <BoardPage board={board} publishAction={setClaimPublicationFormAction} />
}
