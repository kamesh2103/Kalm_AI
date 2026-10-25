// src/config/groq.js
import Groq from "groq-sdk";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const runChat = async (prompt, options = {}) => {
  if (!API_KEY) throw new Error("VITE_GROQ_API_KEY is missing");

  const client = new Groq({
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true,
  });

  // ── Build user content (text + optional image) ──────────────
  let userContent = prompt;

  if (options.image) {
    let imageUrl = options.image;

    if (imageUrl instanceof File) {
      imageUrl = await fileToDataUrl(imageUrl);
    }
    if (typeof imageUrl === "string" &&
        !imageUrl.startsWith("data:image/") &&
        !imageUrl.startsWith("https://")) {
      imageUrl = `data:image/jpeg;base64,${imageUrl}`;
    }

    userContent = [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: imageUrl } },
    ];
  }

  // ── Build message array (system is separate & first) ────────
  const messages = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: userContent });

  const completion = await client.chat.completions.create({
    model: "qwen/qwen3.8-27b",
    messages,
    temperature: options.reasoningEffort === "none" ? 0.7 : 1.0,
    top_p: options.reasoningEffort === "none" ? 0.8 : 0.95,
    max_completion_tokens: 4096,
    reasoning_effort: options.reasoningEffort ?? "default",
    stream: false,
  });

  return completion.choices[0].message.content;
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default runChat;