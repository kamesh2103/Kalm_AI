// src/context/context.jsx
import {
  createContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import runChat from "../config/groq";
import { fileToBase64 } from "../utils/imageToBase64";

export const Context = createContext();

/* ────────────────────────────────────────────────────────────────
   Streaming constants
   ──────────────────────────────────────────────────────────────── */
const STREAM_TICK_MS = 20;
const STREAM_TARGET_TICKS = 200;

const makeChat = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: "New Chat",
  messages: [],
  createdAt: new Date().toISOString(),
  active: true,
});

/* ────────────────────────────────────────────────────────────────
   Branding — ONLY replace real competitor mentions.
   Nothing here forces an introduction.
   ──────────────────────────────────────────────────────────────── */
const BRAND_RULES = [
  // Order matters: most specific first
  [/\ba large language model (?:trained|developed) by Google\b/gi, "Kalm AI, created by Kamesh"],
  [/\bGoogle (?:Gemini|Bard)\b/gi, "Kalm AI"],
  [/\bGemini\b/gi, "Kalm AI"],
  [/\bBard\b/gi, "Kalm AI"],
  [/\bOpenAI\b/gi, "Kalm AI"],
  [/\bChatGPT\b/gi, "Kalm AI"],
  [/\bGPT-?[34](?:\.\d)?\b/gi, "Kalm AI"],
  // NOTE: we deliberately DO NOT blanket-replace "Google" or "Groq"
  // because those appear legitimately ("Google Maps", "Groq API", etc.)
];

const applyBranding = (text) =>
  BRAND_RULES.reduce((acc, [re, rep]) => acc.replace(re, rep), text);

/* ────────────────────────────────────────────────────────────────
   System prompt — instructs formatting ONLY. No forced intro.
   ──────────────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = [
  "You are a helpful, knowledgeable AI assistant.",
  'Your product name is "Kalm AI", created by Kamesh.',
  "IMPORTANT: Do NOT introduce yourself, do NOT say your name, and do NOT add any greeting at the start of a reply.",
  "Only say who you are if the user explicitly asks (e.g. 'who are you?' or 'what is your name?').",
  "For every other message, answer the user's question directly, starting with the answer itself.",
  "",
  "Format every reply in clean GitHub-Flavored Markdown:",
  "- Start with a one-sentence answer, then elaborate.",
  "- Use `##` / `###` headings only for long or multi-part answers.",
  "- Use bullet or numbered lists for steps, options, or comparisons.",
  "- Always wrap code in a fenced block with a language tag, e.g. ```java … ```.",
  "- Use Markdown tables for side-by-side comparisons.",
  "- Keep paragraphs short (2–4 sentences). Bold only key terms.",
  "- End with a short follow-up offer (one line, optional).",
  "",
  "If the user mentions Gemini, Bard, ChatGPT, OpenAI, or GPT, treat Kalm AI as the equivalent and never mention those names back.",
].join("\n");

/* ────────────────────────────────────────────────────────────────
   Tokenizer — keeps whitespace so nothing is lost while streaming
   ──────────────────────────────────────────────────────────────── */
const tokenize = (text) => text.match(/\s+|\S+/g) || [];

/* ────────────────────────────────────────────────────────────────
   Provider
   ──────────────────────────────────────────────────────────────── */
const ContextProvider = ({ children }) => {
  const initialChat = useMemo(() => makeChat(), []);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([initialChat]);
  const [currentChatId, setCurrentChatId] = useState(initialChat.id);

  const streamTimer = useRef(null);
  const abortRef = useRef(null);

  const stopStream = useCallback(() => {
    if (streamTimer.current) {
      clearInterval(streamTimer.current);
      streamTimer.current = null;
    }
  }, []);

  const patchChat = (history, chatId, updater) =>
    history.map((chat) => (chat.id === chatId ? updater(chat) : chat));

  const patchLastMessage = (history, chatId, updater) =>
    patchChat(history, chatId, (chat) => {
      if (chat.messages.length === 0) return chat;
      const last = chat.messages.length - 1;
      return {
        ...chat,
        messages: chat.messages.map((m, i) => (i === last ? updater(m) : m)),
      };
    });

  const streamText = useCallback(
    (chatId, text) => {
      stopStream();

      const tokens = tokenize(text);
      const batch = Math.max(1, Math.ceil(tokens.length / STREAM_TARGET_TICKS));

      let cursor = Math.min(batch, tokens.length);
      setConversationHistory((prev) =>
        patchLastMessage(prev, chatId, (m) => ({
          ...m,
          content: tokens.slice(0, cursor).join(""),
          isLoading: false,
        }))
      );

      if (cursor >= tokens.length) {
        setLoading(false);
        abortRef.current = null;
        return;
      }

      streamTimer.current = setInterval(() => {
        const next = tokens.slice(cursor, cursor + batch).join("");
        cursor += batch;

        setConversationHistory((prev) =>
          patchLastMessage(prev, chatId, (m) => ({
            ...m,
            content: m.content + next,
          }))
        );

        if (cursor >= tokens.length) {
          stopStream();
          setLoading(false);
          abortRef.current = null;
          setConversationHistory((prev) =>
            patchLastMessage(prev, chatId, (m) => ({
              ...m,
              content: text,
              streaming: false,
            }))
          );
        }
      }, STREAM_TICK_MS);
    },
    [stopStream]
  );

  const stopExecution = useCallback(() => {
    stopStream();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
    setConversationHistory((prev) =>
      patchLastMessage(prev, currentChatId, (m) => ({
        ...m,
        isLoading: false,
        streaming: false,
      }))
    );
  }, [currentChatId, stopStream]);

  const createNewChat = useCallback(() => {
    stopStream();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
    setInput("");

    const chat = makeChat();
    setConversationHistory((prev) => [
      chat,
      ...prev.map((c) => ({ ...c, active: false })),
    ]);
    setCurrentChatId(chat.id);
    return chat.id;
  }, [stopStream]);

  const onSent = useCallback(
    async (prompt, imageFile = null) => {
      const text = String(prompt || "").trim();
      if (!text && !imageFile) return;
      if (!currentChatId) return;

      const chatId = currentChatId;
      stopStream();
      setLoading(true);
      setInput("");

      const controller = new AbortController();
      abortRef.current = controller;

      const imageUrl = imageFile ? URL.createObjectURL(imageFile) : null;

      setConversationHistory((prev) =>
        patchChat(prev, chatId, (chat) => ({
          ...chat,
          title:
            chat.messages.length === 0
              ? text.slice(0, 60) || "Image chat"
              : chat.title,
          messages: [
            ...chat.messages,
            {
              role: "user",
              content: text,
              image: imageUrl,
              timestamp: Date.now(),
            },
            {
              role: "assistant",
              content: "",
              isLoading: true,
              streaming: false,
              timestamp: Date.now(),
            },
          ],
        }))
      );

      let streamingStarted = false;

      try {
        let imageDataUrl = null;
        if (imageFile) imageDataUrl = await fileToBase64(imageFile);

        // Instructions go in a real system message (not glued onto the user
        // text), so the model actually follows them: no greeting/intro and
        // clean Markdown formatting.
        const raw = await runChat(text || "(see attached image)", {
          systemPrompt: SYSTEM_PROMPT,
          image: imageDataUrl,
          signal: controller.signal,
          reasoningEffort: imageDataUrl ? "high" : "default",
        });

        if (controller.signal.aborted) return;

        const clean =
          applyBranding(String(raw || "")).trim() ||
          "_Kalm AI did not return a response. Please try again._";

        streamingStarted = true;
        streamText(chatId, clean);
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Chat error:", err);
          setLoading(false);
          setConversationHistory((prev) =>
            patchLastMessage(prev, chatId, (m) => ({
              ...m,
              isLoading: false,
              streaming: false,
              error: true,
              content: [
                "**Something went wrong.**",
                "",
                "> " + (err?.message || "Please try again in a moment."),
              ].join("\n"),
            }))
          );
        }
      } finally {
        if (!streamingStarted) {
          setLoading(false);
          if (abortRef.current === controller) abortRef.current = null;
        }
      }
    },
    [currentChatId, stopStream, streamText]
  );

  useEffect(() => {
    return () => {
      stopStream();
      if (abortRef.current) abortRef.current.abort();
    };
  }, [stopStream]);

  const prevPrompts = useMemo(
    () =>
      conversationHistory
        .filter((c) => c.messages.length > 0)
        .map((c) => c.title),
    [conversationHistory]
  );

  const noop = useCallback(() => {}, []);

  const contextValue = {
    input,
    setInput,
    loading,
    onSent,
    stopExecution,
    conversationHistory,
    currentChatId,
    setCurrentChatId,
    createNewChat,
    prevPrompts,
    setRecentPrompt: noop,
    setResultData: noop,
    setShowResult: noop,
  };

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export default ContextProvider;