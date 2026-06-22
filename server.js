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

// Twilio credentials, also set in Railway → Variables:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_FROM_NUMBER   (the Twilio number you purchased, e.g. +15551234567)
//   OWNER_PHONE_NUMBER   (your real cell, e.g. +13264670354)
// If these aren't set, the server logs the summary instead of texting it,
// so local/dev testing still works without a Twilio account.
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const OWNER_PHONE_NUMBER = process.env.OWNER_PHONE_NUMBER;

let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  const twilio = require("twilio");
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

async function sendSummaryText(summaryText) {
  if (!twilioClient || !TWILIO_FROM_NUMBER || !OWNER_PHONE_NUMBER) {
    console.log("Twilio not configured — would have sent this summary by text:\n", summaryText);
    return;
  }
  try {
    // SMS has a practical length limit; trim very long summaries.
    const body = summaryText.length > 1500 ? summaryText.slice(0, 1490) + "…" : summaryText;
    await twilioClient.messages.create({
      from: TWILIO_FROM_NUMBER,
      to: OWNER_PHONE_NUMBER,
      body: "New Lux-Modern project lead:\n\n" + body,
    });
  } catch (err) {
    console.error("Failed to send summary text via Twilio:", err);
  }
}

const SYSTEM_PROMPT =
  "You are the friendly project intake assistant for Lux-Modern Renovations, a handyman and remodeling company serving Dayton, Ohio and the surrounding Miami Valley metro. Your job is to warmly ask clarifying questions one or two at a time (never a huge list at once) to understand: the type of project (e.g. kitchen, bathroom, deck, drywall, painting, flooring, electrical, plumbing, general handyman repair, etc.), approximate scope/size, materials or finish preferences, timeline, and the property's general location within the Dayton metro. Keep responses brief, conversational, and encouraging — never robotic. " +
  "Before you produce the final summary, you MUST also collect the visitor's name, a phone number, and an email address, so a Lux-Modern specialist can follow up. Ask for these naturally near the end of the conversation, after the project details are mostly clear (for example: \"Last thing — what name, phone number, and email should we follow up with?\"). Do not produce the final Project Summary until you have at least a name and a phone number (email is preferred too, but don't block on it if the visitor declines to share it after being asked once). " +
  "Once you have the project details AND the contact info, produce a clearly formatted 'Project Summary' with bullet points covering: Name, Phone, Email (if provided), Project type, Scope, Estimated size/area, Materials/finish notes, Timeline, Location, and a note that 'A Lux-Modern specialist will follow up with a firm quote within one business day.' Do not invent a dollar figure or firm price — only Lux-Modern staff finalize pricing. Keep the tone premium but approachable, never pushy. Keep replies under 120 words unless delivering the final summary. " +
  "IMPORTANT: The very first time, and only the first time, you deliver the completed Project Summary in a message, end that message on its own new line with exactly this marker and nothing after it: [[SUMMARY_READY]] — do not include this marker in any other message, and do not repeat it in later messages once it has been sent once.";

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
    let reply = textBlock ? textBlock.text : "Sorry, I had trouble processing that — could you try rephrasing?";

    const marker = "[[SUMMARY_READY]]";
    if (reply.includes(marker)) {
      reply = reply.replace(marker, "").trim();
      // Fire-and-forget: don't make the visitor wait on the text send.
      sendSummaryText(reply);
    }

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
