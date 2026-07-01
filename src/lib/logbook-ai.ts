import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";
import { logActivity } from "./activity";

// Automatic risk analysis for Logbook entries. Fired-and-forgotten from
// createLogEntry() right after the entry row commits — never awaited by the
// request path, and any failure here (missing ANTHROPIC_API_KEY, network,
// rate limit, refusal) is swallowed: the LogEntry already saved successfully
// before this runs, so analysis is best-effort enrichment, not a dependency.

const SYSTEM_PROMPT = `You are a restaurant operations risk classifier. You read a single
log entry from a restaurant's daily logbook (operations note, sales/metrics note, customer
complaint, or action-needed item) and classify how urgently management needs to see it.

Guidance:
- HIGH: food safety/illness, injury, legal/compliance exposure, repeated serious complaints,
  significant financial loss, anything requiring same-day management attention.
- MEDIUM: a real issue that should be reviewed soon but isn't an emergency (e.g. a one-off
  wrong order, minor inventory shortage, a guest complaint that was already resolved on the spot).
- LOW: routine operational notes, informational updates, no action needed.

Always call the submit_analysis tool with your classification and a one-sentence summary.`;

const TOOL: Anthropic.Tool = {
  name: "submit_analysis",
  description: "Submit the risk classification and summary for this log entry.",
  input_schema: {
    type: "object",
    properties: {
      riskLevel: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
      summary: { type: "string", description: "One plain-language sentence summarizing the entry." },
    },
    required: ["riskLevel", "summary"],
  },
};

export async function analyzeLogEntry(entryId: string): Promise<void> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return;

    const entry = await prisma.logEntry.findUnique({ where: { id: entryId } });
    if (!entry) return;

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "submit_analysis" },
      messages: [
        {
          role: "user",
          content: `Category: ${entry.category}\nDepartment: ${entry.department}\nItem/dish tag: ${entry.itemTag ?? "none"}\n\nEntry:\n${entry.body}`,
        },
      ],
    });

    const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse) return;

    const input = toolUse.input as { riskLevel: "LOW" | "MEDIUM" | "HIGH"; summary: string };

    await prisma.logEntry.update({
      where: { id: entryId },
      data: {
        aiRiskLevel: input.riskLevel,
        aiSummary: input.summary,
        aiAnalyzedAt: new Date(),
      },
    });

    if (input.riskLevel === "HIGH") {
      await logActivity(prisma, {
        userId: entry.authorId,
        action: "logbook.entry_flagged_high_risk",
        entity: "LogEntry",
        entityId: entryId,
        locationId: entry.locationId,
        meta: { summary: input.summary },
      });
    }
  } catch (err) {
    console.error("[logbook-ai] analysis failed for entry", entryId, err);
  }
}
