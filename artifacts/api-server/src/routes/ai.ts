import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are MindClear's AI brain dump parser. The user will give you a free-form brain dump of thoughts, tasks, events, and ideas. Your job is to extract structured data from it.

Return ONLY valid JSON in this exact shape, no markdown, no explanation:
{
  "tasks": [
    { "text": "task description (max 100 chars)", "priority": "High|Medium|Low", "dueDate": "YYYY-MM-DD or empty string", "notes": "any extra context" }
  ],
  "events": [
    { "title": "event title (max 80 chars)", "date": "YYYY-MM-DD or empty string", "time": "HH:MM 24h or empty string", "description": "optional details" }
  ],
  "notes": [
    { "title": "short title (max 60 chars)", "content": "full note content" }
  ]
}

Rules:
- TODAY is ${new Date().toISOString().split("T")[0]}
- Classify each item as a task (actionable to-do), event (scheduled happening), or note (information/idea)
- If something is both a task and has a date, put it in tasks with a dueDate
- Infer relative dates: "tomorrow", "next Monday", "in 3 days" → actual YYYY-MM-DD
- Infer priority from urgency words: urgent/asap/critical → High, low priority/whenever → Low, else Medium
- Fix typos and spelling errors in the extracted text
- If the whole dump is one idea/reflection with no actions, put it in notes
- Return at least one item total
- Never return empty arrays for all three categories`;

interface ParsedResult {
  tasks: { text: string; priority: string; dueDate: string; notes: string }[];
  events: { title: string; date: string; time: string; description: string }[];
  notes: { title: string; content: string }[];
}

router.post("/ai/parse", async (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "AI not configured", offline: true });
    return;
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text.trim() },
        ],
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errBody = await response.text();
      req.log.error({ status: response.status, body: errBody }, "Groq API error");
      res.status(502).json({ error: "AI service error", offline: true });
      return;
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: ParsedResult;
    try {
      parsed = JSON.parse(raw) as ParsedResult;
    } catch {
      req.log.error({ raw }, "Failed to parse Groq JSON response");
      res.status(502).json({ error: "Invalid AI response", offline: true });
      return;
    }

    // Sanitise & ensure arrays
    const result: ParsedResult = {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };

    // Must have at least one item
    if (result.tasks.length === 0 && result.events.length === 0 && result.notes.length === 0) {
      result.tasks.push({ text: text.trim().slice(0, 100), priority: "Medium", dueDate: "", notes: "" });
    }

    res.json({ ...result, aiPowered: true });
  } catch (err) {
    req.log.error({ err }, "AI parse request failed");
    res.status(503).json({ error: "AI unavailable", offline: true });
  }
});

export default router;
