// src/context/context.jsx
import { createContext, useState, useRef, useEffect } from "react";
import runChat from "../config/groq"; // ← changed from "../config/gemini"
import { fileToBase64 } from "../utils/imageToBase64";

export const Context = createContext();

const ContextProvider = (props) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const timeoutIds = useRef([]);
  const abortController = useRef(null);

  useEffect(() => {
    if (conversationHistory.length === 0) {
      createNewChat();
    }
  }, []);

  const createNewChat = () => {
    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      messages: [],
      createdAt: new Date().toISOString(),
      active: true,
    };
    setConversationHistory((prev) => {
      const updatedHistory = prev.map((chat) => ({ ...chat, active: false }));
      return [newChat, ...updatedHistory];
    });
    setCurrentChatId(newChatId);
    setInput("");
  };

  const formatResponse = (text) => {
    let formatted = text
      .replace(/^(#+)\s(.+)/gm, (match, hashes, content) => {
        const level = hashes.length;
        return `${content}`;
      })
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/^\s*\*\s(.+)/gm, "\n* $1\n")
      .replace(/\n\n+/g, "  \n\n")
      .replace(/\n/g, "  \n")
      .replace(/```([\s\S]*?)```/g, "\n\n    $1\n\n")
      .replace(/`([^`]+)`/g, "`$1`")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    formatted = formatted.replace(/(\n* .*?<\/li>(  \n)*)+/g, (match) => {
      return `\n\n${match.replace(/  \n/g, "")}\n`;
    });

    formatted = formatted
      .replace(/\n\n|<\/p>/g, "")
      .replace(/  \n\n/g, "\n\n")
      .replace(/^([^<].*)/gm, "\n\n$1");

    return formatted;
  };

  const clearAllTimeouts = () => {
    timeoutIds.current.forEach((id) => clearTimeout(id));
    timeoutIds.current = [];
  };

  const stopExecution = () => {
    clearAllTimeouts();
    if (abortController.current) {
      abortController.current.abort();
    }
    setLoading(false);
    setConversationHistory((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? {
              ...chat,
              messages: chat.messages.map((msg, i) =>
                i === chat.messages.length - 1
                  ? { ...msg, isLoading: false }
                  : msg
              ),
            }
          : chat
      )
    );
  };

  const delayPara = (index, nextWord, chatId) => {
    const id = setTimeout(() => {
      setConversationHistory((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map((msg, i) =>
                  i === chat.messages.length - 1
                    ? { ...msg, content: msg.content + nextWord }
                    : msg
                ),
              }
            : chat
        )
      );
    }, 25 * index);
    timeoutIds.current.push(id);
  };

  // ─────────────────────────────────────────────────────────────
  // onSent now accepts an optional imageFile (File object)
  // ─────────────────────────────────────────────────────────────
  const onSent = async (prompt, imageFile = null) => {
    if (!prompt.trim() && !imageFile) return;

    setLoading(true);
    abortController.current = new AbortController();

    // 1. Add the user's message to the conversation
    setConversationHistory((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  role: "user",
                  content: prompt,
                  image: imageFile ? URL.createObjectURL(imageFile) : null, // for UI preview (optional)
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : chat
      )
    );

    // 2. Add the assistant placeholder message
    setConversationHistory((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  role: "assistant",
                  content: "",
                  isLoading: true,
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : chat
      )
    );

    try {
      // 3. Convert the image (if any) to a base64 data URL
      let imageDataUrl = null;
      if (imageFile) {
        imageDataUrl = await fileToBase64(imageFile);
      }

      // 4. Add branding to the prompt
      const finalPrompt = `You are Kalm AI, an assistant created by Kamesh. Always refer to yourself as "Kalm AI". ${prompt}`;

      // 5. Call Groq with text + optional image
      const response = await runChat(finalPrompt, {
        image: imageDataUrl,          // ← image is passed here
        signal: abortController.current.signal,
        reasoningEffort: imageDataUrl ? "high" : "default", // deeper analysis for images
      });

      // 6. Force brand replacement in output
      let customResponse = response
        .replace(/Gemini/gi, "Kalm AI")
        .replace(/Google/gi, "Kalm AI")
        .replace(/a large language model trained by Kalm AI/gi, "Kalm AI by Kamesh");

      const formattedResponse = formatResponse(customResponse);
      const words = formattedResponse.split(/(<[^>]+>|\s+)/).filter(Boolean);

      // 7. Clear the assistant placeholder and start streaming
      setConversationHistory((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                messages: chat.messages.map((msg, i) =>
                  i === chat.messages.length - 1
                    ? { ...msg, content: "", isLoading: false }
                    : msg
                ),
              }
            : chat
        )
      );

      words.forEach((word, i) => delayPara(i, word, currentChatId));
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Chat error:", error);
        setConversationHistory((prev) =>
          prev.map((chat) =>
            chat.id === currentChatId
              ? {
                  ...chat,
                  messages: chat.messages.map((msg, i) =>
                    i === chat.messages.length - 1
                      ? {
                          ...msg,
                          content:
                            "\n\nError: Something went wrong. Please try again.\n\n",
                          isLoading: false,
                        }
                      : msg
                  ),
                }
              : chat
          )
        );
      }
    } finally {
      if (abortController.current) {
        setLoading(false);
        setInput("");
        abortController.current = null;
      }
    }
  };

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
  };

  useEffect(() => {
    return () => {
      clearAllTimeouts();
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return <Context.Provider value={contextValue}>{props.children}</Context.Provider>;
};

export default ContextProvider;