// src/config/groqVision.js
import Groq from "groq-sdk";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = "qwen/qwen3.8-27b";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // Groq hard limit: 20 MB
const MAX_IMAGES = 3;                     // Groq hard limit for this model

const groq = new Groq({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true, // remove when moving to a backend
});

/**
 * Normalise any image input into a Groq‑compatible data URL.
 * @param {string} input – File path, raw base64, data URL, or http(s) URL.
 * @param {string} [mime="image/jpeg"] – Used only for raw base64.
 * @returns {string} A `data:<mime>;base64,<data>` string or the original URL.
 */
export function toGroqImage(input, mime = "image/jpeg") {
  if (typeof input !== "string" || !input.trim()) {
    throw new TypeError("[groqVision] image must be a non‑empty string");
  }

  const trimmed = input.trim();

  // Already a data URL – validate the prefix.
  if (trimmed.startsWith("data:")) {
    if (!trimmed.includes(";base64,")) {
      throw new Error(
        "[groqVision] data URL is missing `;base64,`. " +
          "Expected format: data:image/jpeg;base64,<data>"
      );
    }
    console.log(
      `[groqVision] image is a data URL (${(
        trimmed.length / 1024
      ).toFixed(1)} KB payload)`
    );
    return trimmed;
  }

  // Public URL – pass through (Groq fetches it server‑side).
  if (/^https?:\/\//i.test(trimmed)) {
    console.log(`[groqVision] image is a remote URL: ${trimmed}`);
    return trimmed;
  }

  // Assume raw base64 – wrap it with the correct MIME type.
  const clean = trimmed.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+=*$/.test(clean)) {
    throw new Error(
      "[groqVision] input looks like raw base64 but contains invalid characters"
    );
  }
  const dataUrl = `data:${mime};base64,${clean}`;
  console.log(
    `[groqVision] wrapped raw base64 as data URL (${(
      dataUrl.length / 1024
    ).toFixed(1)} KB)`
  );
  return dataUrl;
}

/**
 * Convert a browser File object to a Groq data URL.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function fileToGroqImage(file) {
  if (!(file instanceof File)) {
    return Promise.reject(new TypeError("[groqVision] expected a File object"));
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Promise.reject(
      new Error(
        `[groqVision] file is ${(file.size / 1024 / 1024).toFixed(
          1
        )} MB; Groq's limit is 20 MB`
      )
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      console.log(
        `[groqVision] file read: ${file.name} (${file.type}, ${(
          file.size / 1024
        ).toFixed(1)} KB)`
      );
      resolve(reader.result); // already a data URL
    };
    reader.onerror = () =>
      reject(new Error(`[groqVision] FileReader error: ${reader.error}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Call Qwen 3.8 27B with optional images.
 *
 * @param {string} prompt
 * @param {Object} [options]
 * @param {string|string[]} [options.image] – URL, raw base64, or data URL.
 * @param {string} [options.mime="image/jpeg"] – MIME type for raw base64.
 * @param {"none"|"default"|"low"|"medium"|"high"} [options.reasoningEffort="default"]
 * @param {AbortSignal} [options.signal]
 * @param {number} [options.retries=2] – Retry count for 429/5xx errors.
 * @returns {Promise<string>} The assistant's reply (final answer only).
 */
export async function runGroqVision(prompt, options = {}) {
  if (!API_KEY) {
    throw new Error(
      "[groqVision] VITE_GROQ_API_KEY is not defined. " +
        "Add it to your .env file and restart Vite."
    );
  }

  // ---- 1. Build content parts -------------------------------------------
  const images = Array.isArray(options.image)
    ? options.image
    : options.image
    ? [options.image]
    : [];

  if (images.length > MAX_IMAGES) {
    throw new Error(
      `[groqVision] qwen/qwen3.8-27b accepts at most ${MAX_IMAGES} images per request`
    );
  }

  const content = [];
  if (prompt) {
    content.push({ type: "text", text: prompt });
  }

  images.forEach((img, idx) => {
    try {
      const url = toGroqImage(img, options.mime);
      content.push({ type: "image_url", image_url: { url } });
      console.log(`[groqVision] image ${idx + 1}/${images.length} attached`);
    } catch (err) {
      throw new Error(`[groqVision] image ${idx + 1} is invalid: ${err.message}`);
    }
  });

  if (content.length === 0) {
    throw new Error("[groqVision] provide at least a prompt or an image");
  }

  // ---- 2. Mode & sampling ------------------------------------------------
  const effort = options.reasoningEffort ?? "default";
  const thinking = effort !== "none";
  const temperature = thinking ? 1.0 : 0.7;
  const topP = thinking ? 0.95 : 0.8;
  const topK = 20;
  const minP = 0;

  console.log(
    `[groqVision] mode=${thinking ? "thinking" : "instruct"} ` +
      `effort=${effort} temp=${temperature} top_p=${topP}`
  );

  // ---- 3. Call with retry -----------------------------------------------
  const maxRetries = options.retries ?? 2;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[groqVision] attempt ${attempt + 1}/${maxRetries + 1} → ${MODEL}`
      );

      const completion = await groq.chat.completions.create(
        {
          model: MODEL,
          messages: [{ role: "user", content }],
          temperature,
          top_p: topP,
          top_k: topK,
          min_p: minP,
          max_completion_tokens: 4096,
          reasoning_effort: effort,
          reasoning_format: "hidden", // return only the final answer
          stream: false,
        },
        { signal: options.signal || null }
      );

      const message = completion.choices?.[0]?.message;
      if (!message?.content) {
        throw new Error(
          "[groqVision] API returned an empty message. " +
            "Check that the image is valid and the model is not text‑only."
        );
      }

      console.log(
        `[groqVision] success (usage: ${completion.usage?.total_tokens ?? "?"} tokens)`
      );
      return message.content;
    } catch (err) {
      lastError = err;

      // Do not retry on aborts or client errors (4xx except 429).
      if (err.name === "AbortError") {
        console.warn("[groqVision] request aborted by caller");
        throw err;
      }
      const status = err.status ?? err.response?.status;
      const retryable =
        status === 429 || (status >= 500 && status < 600) || !status;

      if (!retryable || attempt === maxRetries) {
        console.error("[groqVision] non‑retryable error:", {
          status,
          message: err.message,
          body: err.error ?? err.response?.data,
        });
        throw err;
      }

      const backoff = 500 * 2 ** attempt;
      console.warn(
        `[groqVision] retryable error (status ${status}). ` +
          `Retrying in ${backoff} ms…`
      );
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  throw lastError;
}

export default runGroqVision;