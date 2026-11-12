import { prisma } from '@/lib/db'

export interface SaveChatMessageInput {
  userId: string
  businessId: string
  branchId?: string | null
  prompt: string
  response: string
  label?: string
  dataSnapshot?: Record<string, unknown> | null
}

export interface ChatHistoryMessage {
  id: string
  prompt: string
  response: string
  label: string | null
  dataSnapshot: Record<string, unknown> | null
  createdAt: Date
}

/**
 * Saves a completed chat conversation turn (prompt, response, data snapshot) to the database.
 * Non-blocking: does not throw, ensuring core business operation remains resilient.
 */
export async function saveChatMessage(input: SaveChatMessageInput): Promise<{ success: boolean; id?: string }> {
  try {
    const id = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const snapshotJson = input.dataSnapshot ? JSON.stringify(input.dataSnapshot) : null

    await prisma.$executeRaw`
      INSERT INTO "ChatMessage" (
        "id",
        "userId",
        "businessId",
        "branchId",
        "prompt",
        "response",
        "label",
        "dataSnapshot",
        "createdAt"
      ) VALUES (
        ${id},
        ${input.userId},
        ${input.businessId},
        ${input.branchId ?? null},
        ${input.prompt},
        ${input.response},
        ${input.label ?? null},
        ${snapshotJson}::jsonb,
        NOW()
      )
    `

    return { success: true, id }
  } catch (error) {
    console.error('[saveChatMessage Error]:', error)
    return { success: false }
  }
}

/**
 * Fetches the recent conversation history for the authenticated user.
 */
export async function getChatHistory(userId: string, limit = 25): Promise<ChatHistoryMessage[]> {
  try {
    const rows = await prisma.$queryRaw<ChatHistoryMessage[]>`
      SELECT "id", "prompt", "response", "label", "dataSnapshot", "createdAt"
      FROM "ChatMessage"
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" ASC
      LIMIT ${limit}
    `
    return rows
  } catch (error) {
    console.error('[getChatHistory Error]:', error)
    return []
  }
}

