---
name: add-ai-question-or-content-type
description: Use when adding a new question the AI assistant can answer, or a new type of unstructured content it can search, such as a new report the assistant should explain or a new kind of note or document it should retrieve.
---

# Add a New AI-Answered Question or Searchable Content Type

Follow these steps in order for any new question or content type.

1. Decide whether this is a structured question, one with a numeric or factual answer computable from records, or an unstructured content type, such as free text, a note, or a document, per the two categories in .agent/rules/ai-and-vector.md.
2. If structured: write the direct database query and calculation for this question first, scoped to the asking user's business, branch, and role per .agent/rules/authorization.md. Confirm the AI model is used only to phrase this already-computed result, never to produce the number itself, per .agent/rules/ai-and-vector.md.
3. If unstructured: tag new content with its businessId, branchId, and content type at creation, then generate and store its embedding through pgvector, per .agent/rules/ai-and-vector.md.
4. Confirm the answer or search filters by businessId, branchId, and the asking user's role before any result is returned, for either type.
5. Confirm the answer reaching the user is labeled as a calculated fact, an estimate, or insufficient data, per .agent/rules/ai-and-vector.md.
6. If this question could reasonably need both a calculated result and related unstructured context, combine them into one answer rather than building two separate features, per .agent/rules/ai-and-vector.md.
7. Confirm a failure of the AI service for this question or content type shows a plain error message and does not block reading or writing the underlying business record.
8. If this is a new unstructured content type, confirm its embedding is regenerated whenever its source record is updated, per .agent/rules/ai-and-vector.md.

Each step is done when the behavior it describes can be demonstrated, not assumed. A question or content type is not complete until step 4 and step 5 both pass for it specifically.