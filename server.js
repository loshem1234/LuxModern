// ===========================================================
// Lux-Modern Renovations — server
//
// Serves the static site AND exposes a single backend route,
// /api/chat, that holds the Anthropic API key server-side.
// The browser never sees the key — it only talks to /api/chat.
// ===========================================================

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Anthropic key lives only in the server environment (set in
// Railway's Variables tab as ANTHROPIC_API_KEY). It is never
// sent to the browser.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT =
  "You are the friendly project intake assistant for Lux-Modern Renovations, a handyman and remodeling company serving Dayton, Ohio and the surrounding Miami Valley metro. Your job is to warmly ask clarifying questions one or two at a time (never a huge list at once) to understand: the type of project (e.g. kitchen, bathroom, deck, drywall, painting, flooring, electrical, plumbing, general handyman repair, etc.), approximate scope/size, materials or finish preferences, timeline, and the property's general location within the Dayton metro. Keep responses brief, conversational, and encouraging — never robotic. Once you have enough detail (usually after 3-5 exchanges), produce a clearly formatted 'Project Summary' with bullet points covering: Project type, Scope, Estimated size/area, Materials/finish notes, Timeline, Location, and a note that 'A Lux-Modern specialist will follow up with a firm quote within one business day.' Do not invent a dollar figure or firm price — only Lux-Modern staff finalize pricing. Keep the tone premium but approachable, never pushy. Keep replies under 120 words unless delivering the final summary.";

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Very small in-memory rate limiter: caps requests per IP per minute
// so a single visitor (or bot) can't rack up API spend unattended.
const rateLimitWindowMs = 60 * 1000;
const rateLimitMax = 20;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - rateLimitWindowMs;
  const timestamps = (hits.get(ip) || []).filter((t) => t > windowStart);
  timestamps.push(now);
  hits.set(ip, timestamps);
  return timestamps.length > rateLimitMax;
}

app.post("/api/chat", async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error:
          "Server is missing ANTHROPIC_API_KEY. Add it in Railway → Variables, then redeploy.",
      });
    }

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: "Too many requests. Please try again shortly." });
    }

    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Request must include a non-empty messages array." });
    }

    // Basic shape validation — only forward role/content pairs we expect.
    const safeMessages = messages
      .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .slice(-30) // cap conversation length forwarded per request
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: safeMessages,
      }),
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error("Anthropic API error:", data);
      return res.status(502).json({ error: "Upstream API error." });
    }

    const textBlock = (data.content || []).find((b) => b.type === "text");
    const reply = textBlock ? textBlock.text : "Sorry, I had trouble processing that — could you try rephrasing?";

    res.json({ reply });
  } catch (err) {
    console.error("Chat proxy error:", err);
    res.status(500).json({ error: "Something went wrong handling that request." });
  }
});

app.get("/healthz", (req, res) => res.send("ok"));

app.listen(PORT, () => {
  console.log(`Lux-Modern site running on port ${PORT}`);
});
