// src/Components/Main/Main.jsx
import React, { useContext, useRef, useEffect, useState } from "react";
import { assets } from "../../assets/assets";
import { Context } from "../../context/context";
import { GiHamburgerMenu } from "react-icons/gi";

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

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Image state ──────────────────────────────────────────────
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleStopResponse = () => {
    stopExecution();
  };

  const handleCardClick = (cardText) => {
    setInput(cardText);
  };

  // ── Image selection ──────────────────────────────────────────
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert("Image must be smaller than 20 MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Send handler ─────────────────────────────────────────────
  const handleSend = () => {
    if (!input.trim() && !imageFile) return;

    onSent(input, imageFile); // ← pass the image to context
    clearImage();             // clear preview immediately after sending
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getCurrentConversation = () => {
    return (
      conversationHistory.find((chat) => chat.id === currentChatId) || {
        messages: [],
      }
    );
  };

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

  const getLeftMargin = () => {
    if (isMobile) return "0";
    return sidebarExtended ? "16rem" : "5rem";
  };

  return (
    <div
      className="flex-1 min-h-screen pb-24 relative"
      style={{ marginLeft: getLeftMargin() }}
    >
      {/* Navbar */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-white z-10">
        <GiHamburgerMenu
          className="text-2xl cursor-pointer md:hidden"
          onClick={toggleSidebar}
        />
        <h1 className="text-lg font-semibold">Kalm AI</h1>
        <img src={assets.user_icon} alt="user" className="w-8 rounded-full" />
      </div>

      {/* Content Area */}
      <div className="px-4">
        {getCurrentConversation().messages.length === 0 ? (
          <>
            <div className="mt-8">
              <h1 className="text-3xl font-bold">Hello, Dev</h1>
              <p className="text-xl text-gray-600">How can I help you today?</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {promptCards.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleCardClick(item.text)}
                  className="relative h-[170px] bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                >
                  <p className="text-sm text-gray-700">{item.text}</p>
                  <img
                    src={item.icon}
                    alt="icon"
                    className="w-6 h-6 self-end opacity-60"
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-6 space-y-4">
            {getCurrentConversation().messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "user" ? (
                  <div className="bg-blue-100 rounded-2xl px-4 py-2 max-w-[80%]">
                    {message.image && (
                      <img
                        src={message.image}
                        alt="uploaded"
                        className="max-w-[200px] rounded-lg mb-2"
                      />
                    )}
                    <p className="text-sm text-gray-800">{message.content}</p>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-2xl px-4 py-2 max-w-[80%]">
                    {message.isLoading ? (
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-semibold text-gray-500 block mb-1">
                          Kalm AI
                        </span>
                        <div
                          className="text-sm text-gray-800"
                          dangerouslySetInnerHTML={{ __html: message.content }}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {/* Image preview */}
          {imagePreview && (
            <div className="relative inline-block mb-2">
              <img
                src={imagePreview}
                alt="preview"
                className="h-20 w-20 object-cover rounded-lg border"
              />
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            {/* Hidden file input */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Gallery icon → opens file picker */}
            <img
              src={assets.gallery_icon}
              alt="Gallery"
              className="w-6 h-6 cursor-pointer opacity-60 hover:opacity-100"
              onClick={() => fileInputRef.current?.click()}
            />

            {/* Text input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter a prompt here"
              className="flex-1 bg-transparent border-none outline-none py-1 px-3 text-sm text-gray-700 placeholder-gray-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (input.trim() !== "" || imageFile)) {
                  handleSend();
                }
              }}
            />

            {/* Mic icon (unchanged) */}
            <img
              src={assets.mic_icon}
              alt="Mic"
              className="w-6 h-6 opacity-60"
            />

            {/* Send / Stop button */}
            {loading && getCurrentConversation().messages.slice(-1)[0]?.isLoading ? (
              <button
                onClick={handleStopResponse}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 hover:bg-red-600"
              >
                <span className="w-2 h-2 bg-white rounded-sm" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={input.trim() === "" && !imageFile}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                  input.trim() !== "" || imageFile
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-gray-200 cursor-not-allowed"
                }`}
              >
                <img src={assets.send_icon} alt="Send" className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center mt-2">
            Kalm AI may display inaccurate info, including about people, so
            double-check its response
          </p>
        </div>
      </div>
    </div>
  );
};

export default Main;