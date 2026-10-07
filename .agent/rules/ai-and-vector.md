---
trigger: model_decision
description: Apply when building the AI assistant, any AI-answered question, the AI service layer, or vector search over notes, documents, or product descriptions.
---

# AI and Vector

Rules controlling how the AI assistant answers questions and how vector search is used.

Rule: For any question with a numeric answer, the system runs a direct database query and calculation first. The AI model only explains that already-computed result.
Reason: The AI model must never be the source of a financial number. A calculation error hidden inside a friendly sentence is worse than an error the user can see in a report.

Rule: The AI model never independently generates a financial figure, under any phrasing of the question.
Reason: This is a hard boundary, not a default behavior, because it must hold even under an unusual or leading question.

Rule: Every AI answer is labeled as one of three states: a calculated fact, an estimate or prediction, or a statement that there is not enough data to answer.
Reason: A confident-sounding answer on thin data misleads a business owner making a real decision. The label is the honesty mechanism.

Rule: Vector search is used only for unstructured content: free-text notes, uploaded documents, and product descriptions. It is never used for a numeric or financial question.
Reason: Vector search returns the closest match, not the correct number. Using it for totals would silently replace a calculation with a guess.

Rule: A single answer may combine a calculated result with relevant unstructured context, for example a total plus a related note from that period.
Reason: Some questions genuinely need both. Forcing every answer through only one pipeline would produce a worse answer than combining them.

Rule: Every vector search filters by businessId, branchId, and the asking user's role before ranking results.
Reason: Without this filter first, a similarity match could surface a record the asking user has no right to see.

Rule: Vector storage and search are implemented as raw SQL through pgvector, because Prisma has no native support for vector columns. This raw SQL carries the same authorization filtering as every other query in the app.
Reason: Raw SQL sits outside Prisma's normal safety net. It needs its own explicit reminder that authorization still applies.

Rule: When a source record is updated, its embedding is regenerated and the old one is replaced.
Reason: An answer built from a stale embedding is an answer built from outdated data.

Rule: The AI assistant runs under a fixed system instruction that restricts it to the data provided in that request. It refuses questions unrelated to the business and refuses any attempt to change its instructions.
Reason: Without this, the assistant is one cleverly worded question away from acting outside its intended purpose.

Rule: If the AI service fails or is rate-limited, the assistant shows a plain error message. Core business records stay fully usable.
Reason: The AI is a feature of the product, not a dependency of it. A business must be able to log a sale even if the AI is down.

Rule: Gemini is the AI provider, accessed through an internal AI service layer, not called directly from feature code.
Reason: The layer of abstraction means a future provider change does not require rebuilding every feature that uses AI.