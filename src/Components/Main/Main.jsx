// src/Components/Main/Main.jsx
import React, {
  useContext,
  useRef,
  useEffect,
  useState,
  useLayoutEffect,
  useMemo,
} from "react";
import { assets } from "../../assets/assets";
import { Context } from "../../context/context";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { FiArrowDown } from "react-icons/fi";
import MarkdownRenderer from "../Markdown/MarkdownRenderer";

const LOGO = `${import.meta.env.BASE_URL}logoc.png`;

const promptCards = [
  {
    text: "Suggest beautiful places to see on an upcoming road trip",
    icon: assets.compass_icon,
  },
  {
    text: "Briefly summarise this concept: urban planning",
    icon: assets.bulb_icon,
  },
  {
    text: "Brainstorm team bonding activities for our work retreat",
    icon: assets.message_icon,
  },
  {
    text: "Improve the readability of the following code",
    icon: assets.code_icon,
  },
];

const TypingDots = () => (
  <div
    className="flex items-center gap-1.5 py-2"
    aria-label="Kalm AI is thinking"
  >
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
  </div>
);

const Main = ({ sidebarExtended, isMobile, toggleSidebar }) => {
  const {
    onSent,
    loading,
    setInput,
    input,
    stopExecution,
    conversationHistory,
    currentChatId,
  } = useContext(Context);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const stickToBottom = useRef(true);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showJump, setShowJump] = useState(false);

  const messages = useMemo(
    () =>
      conversationHistory.find((c) => c.id === currentChatId)?.messages ?? [],
    [conversationHistory, currentChatId],
  );
  const waitingForReply = loading; // show Stop while waiting AND while text is streaming

  /* ── image handling ───────────────────────────────────────── */
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return alert("Please select an image file.");
    if (file.size > 20 * 1024 * 1024)
      return alert("Image must be smaller than 20 MB.");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── send ─────────────────────────────────────────────────── */
  const canSend = input.trim() !== "" || !!imageFile;

  const handleSend = () => {
    if (!canSend || loading) return;
    stickToBottom.current = true;
    onSent(input, imageFile);
    clearImage();
  };

  const handleKeyDown = (e) => {
    // Enter sends, Shift+Enter inserts a newline. Don't hijack IME composition.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── auto-grow textarea ───────────────────────────────────── */
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "10px"; // collapse first so scrollHeight is the true content height
    const next = Math.min(el.scrollHeight, 160);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden"; // no scrollbar for 1 line
  }, [input]);

  /* ── scrolling: follow the stream unless the user scrolled up ─ */
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance < 80;
    setShowJump(distance > 240);
  };

  useEffect(() => {
    if (stickToBottom.current) {
      bottomRef.current?.scrollIntoView({
        behavior: loading ? "auto" : "smooth",
        block: "end",
      });
    }
  }, [conversationHistory, loading]);

  // switching chats → jump to bottom
  useEffect(() => {
    stickToBottom.current = true;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [currentChatId]);

  const jumpToBottom = () => {
    stickToBottom.current = true;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const leftOffset = isMobile ? "0px" : sidebarExtended ? "16rem" : "5rem";

  return (
    <div
      className="flex flex-col h-[100dvh] bg-white transition-[margin] duration-300 ease-in-out"
      style={{ marginLeft: leftOffset }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-3 sm:px-5 h-14 border-b border-gray-100 bg-white/90 backdrop-blur z-10">
        <div className="flex items-center gap-2 min-w-0">
          {isMobile && (
            <button
              onClick={toggleSidebar}
              aria-label="Open menu"
              className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200"
            >
              <HiOutlineMenuAlt2 className="text-2xl" />
            </button>
          )}
          <h1 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
            Kalm AI
          </h1>
        </div>
        <img
          src={assets.user_icon}
          alt="user"
          className="w-8 h-8 rounded-full flex-shrink-0"
        />
      </header>

      {/* ── Scrollable conversation ─────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="absolute inset-0 overflow-y-auto overscroll-contain"
        >
          <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-6">
            {messages.length === 0 ? (
              <div className="pt-4 sm:pt-12">
                <h2 className="text-3xl sm:text-5xl font-semibold leading-tight">
                  <span className="bg-gradient-to-r from-blue-500 to-red-400 bg-clip-text text-transparent">
                    Hello, Dev
                  </span>
                </h2>
                <p className="mt-1 text-2xl sm:text-4xl font-semibold text-gray-300">
                  How can I help you today?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8 sm:mt-12">
                  {promptCards.map((item) => (
                    <button
                      key={item.text}
                      onClick={() => {
                        setInput(item.text);
                        textareaRef.current?.focus();
                      }}
                      className="text-left relative min-h-[96px] sm:min-h-[170px] bg-gray-50 hover:bg-gray-100 p-4 rounded-2xl border border-gray-100 flex flex-col justify-between gap-4 transition-colors"
                    >
                      <p className="text-sm text-gray-700 pr-8">{item.text}</p>
                      <img
                        src={item.icon}
                        alt=""
                        className="w-8 h-8 p-1.5 bg-white rounded-full self-end shadow-sm"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) =>
                  message.role === "user" ? (
                    <div key={index} className="flex justify-end">
                      <div className="max-w-[85%] sm:max-w-[75%] bg-blue-50 text-gray-800 rounded-2xl rounded-br-md px-4 py-2.5">
                        {message.image && (
                          <img
                            src={message.image}
                            alt="uploaded"
                            className="max-w-full sm:max-w-[240px] rounded-lg mb-2"
                          />
                        )}
                        {message.content && (
                          <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={index} className="flex gap-3 items-start">
                      <img
                        src={LOGO}
                        alt="Kalm AI"
                        className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5 border border-gray-100"
                      />
                      <div className="flex-1 min-w-0">
                        {message.isLoading ? (
                          <TypingDots />
                        ) : !message.content ? (
                          <p className="text-sm italic text-gray-400 py-1">
                            Response stopped.
                          </p>
                        ) : message.error ? (
                          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <MarkdownRenderer content={message.content} />
                          </div>
                        ) : (
                          <MarkdownRenderer content={message.content} />
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
            <div ref={bottomRef} className="h-1" />
          </div>
        </div>

        {/* Jump-to-latest button */}
        {showJump && (
          <button
            onClick={jumpToBottom}
            aria-label="Scroll to latest"
            className="absolute left-1/2 -translate-x-1/2 bottom-3 z-20 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50"
          >
            <FiArrowDown />
          </button>
        )}
      </div>

      {/* ── Composer ────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white px-3 sm:px-6 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto">
          {imagePreview && (
            <div className="relative inline-block mb-2">
              <img
                src={imagePreview}
                alt="preview"
                className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-lg border"
              />
              <button
                onClick={clearImage}
                aria-label="Remove image"
                className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 bg-gray-100 rounded-3xl pl-3 pr-2 py-2 focus-within:ring-2 focus-within:ring-blue-200 transition-shadow">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach image"
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-200"
            >
              <img
                src={assets.gallery_icon}
                alt=""
                className="w-5 h-5 opacity-70"
              />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a prompt here"
              className="flex-1 min-w-0 bg-transparent border-none outline-none resize-none block text-gray-800 placeholder-gray-400"
              style={{
                // inline so alignment never depends on Tailwind output
                fontSize: "16px", // 16px stops iOS zooming on focus
                lineHeight: "24px",
                padding: "6px 4px",
                height: "36px",
                maxHeight: "160px",
                overflowY: "hidden",
                scrollbarWidth: "none",
              }}
            />

            <img
              src={assets.mic_icon}
              alt=""
              className="hidden sm:block w-5 h-5 mb-2 opacity-60 flex-shrink-0"
            />

            {waitingForReply ? (
              <button
                onClick={stopExecution}
                aria-label="Stop"
                className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-red-500 hover:bg-red-600"
              >
                <span className="w-3 h-3 bg-white rounded-sm" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend || loading}
                aria-label="Send"
                className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                  canSend && !loading
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                <img src={assets.send_icon} alt="" className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-[11px] sm:text-xs text-gray-400 text-center mt-2 leading-snug">
            Kalm AI may display inaccurate info, so double-check its response.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Main;
