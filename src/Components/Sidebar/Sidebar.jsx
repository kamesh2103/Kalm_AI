import React, { useState, useContext, useEffect } from "react";
import { assets } from "../../assets/assets";
import { Context } from "../../context/context";
import {
  TbLayoutSidebarRightExpand,
  TbLayoutSidebarLeftExpand,
} from "react-icons/tb";
import { HiChevronDoubleRight, HiChevronDoubleLeft } from "react-icons/hi2";

const Sidebar = ({ isOpen, toggleSidebar, extended, toggleExtended }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);

  const {
    onSent,
    prevPrompts,
    setRecentPrompt,
    setInput,
    setResultData,
    setShowResult,
    conversationHistory,
    setCurrentChatId,
    createNewChat,
  } = useContext(Context);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 600;
      setIsMobile(mobile);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadPrompt = async (chatId) => {
    const chat = conversationHistory.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      if (isMobile) toggleSidebar();
    }
  };

  const handleNewChat = () => {
    createNewChat();
    if (isMobile) toggleSidebar();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 z-50 h-full
          bg-gray-900 
          flex flex-col justify-between
          transition-all duration-300 ease-in-out
          ${isMobile 
            ? `w-64 ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl` 
            : `${extended ? 'w-64' : 'w-20'} translate-x-0`
          }
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header Section */}
          <div className="flex-shrink-0 p-4">
            {/* Mobile header with logo and close button */}
            {isMobile && (
              <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                <div className="flex items-center gap-2">
                  <img src="logoc.png" alt="logo" className="h-7" />
                  <span className="text-white font-medium">Kalm AI</span>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <HiChevronDoubleLeft size={24} />
                </button>
              </div>
            )}

            {/* Desktop logo + toggle */}
            {!isMobile && (
              <div
                className={`
                  flex items-center w-full p-2 mb-4
                  ${extended ? "justify-between" : "justify-center"}
                `}
              >
                {extended && (
                  <div className="flex items-center gap-2">
                    <img src="logoc.png" alt="logo" className="h-7" />
                    <span className="text-white font-medium">Kalm AI</span>
                  </div>
                )}
                <button
                  onClick={toggleExtended}
                  className="cursor-pointer flex items-center text-2xl text-gray-400 hover:text-white transition-colors"
                >
                  {extended ? (
                    <TbLayoutSidebarRightExpand />
                  ) : (
                    <TbLayoutSidebarLeftExpand />
                  )}
                </button>
              </div>
            )}

            {/* New chat button */}
            <button
              className={`
                w-full flex items-center gap-3 
                px-4 py-3 mb-6 bg-gray-700 rounded-lg
                text-sm font-medium text-white cursor-pointer
                hover:bg-gray-600 transition-colors
                ${!extended && !isMobile && "justify-center px-2"}
              `}
              onClick={handleNewChat}
            >
              <img
                src={assets.plus_icon}
                alt="plus"
                className="w-5 h-5 filter brightness-0 invert flex-shrink-0"
              />
              {(extended || isMobile) && <span>New Chat</span>}
            </button>
          </div>

          {/* Scrollable Content Section */}
          <div className="flex-1 overflow-hidden">
            {/* Recent chats - Extended view */}
            {(extended || isMobile) && (
              <div className="px-4 h-full flex flex-col">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2 flex-shrink-0">
                  Recent Conversations
                </p>
                <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                  {conversationHistory.length > 0 ? (
                    conversationHistory.map((chat) => (
                      <button
                        key={chat.id}
                        className={`
                          w-full flex items-start gap-3 p-2 px-3
                          rounded-lg text-sm text-gray-200 cursor-pointer
                          hover:bg-gray-700 transition-colors
                          ${chat.active ? 'bg-gray-700' : ''}
                        `}
                        onClick={() => loadPrompt(chat.id)}
                      >
                        <img
                          src={assets.message_icon}
                          alt="msg"
                          className="w-4 h-4 mt-0.5 flex-shrink-0 filter brightness-0 invert opacity-70"
                        />
                        <span className="truncate text-left">
                          {chat.messages[0]?.content.slice(0, 30) || "New Chat"}
                          {chat.messages[0]?.content.length > 30 ? "..." : ""}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="text-gray-400 text-sm px-3 py-2">
                      No conversations yet
                    </div>
                  )}
                </div>
              </div>
            )}


          </div>

          {/* Bottom Menu */}
          <div className="flex-shrink-0 p-4">
            <div className="flex flex-col space-y-2">
              <button
                className={`
                  flex items-center gap-3 p-2 px-3 rounded-lg
                  cursor-pointer text-sm text-gray-300
                  hover:bg-gray-700 transition-colors
                  ${!extended && !isMobile && "justify-center px-2"}
                `}
                title={!extended && !isMobile ? "Help" : ""}
              >
                <img
                  src={assets.question_icon}
                  alt="help"
                  className="w-5 h-5 filter brightness-0 invert opacity-70 flex-shrink-0"
                />
                {(extended || isMobile) && <span>Help</span>}
              </button>
              <button
                className={`
                  flex items-center gap-3 p-2 px-3 rounded-lg
                  cursor-pointer text-sm text-gray-300
                  hover:bg-gray-700 transition-colors
                  ${!extended && !isMobile && "justify-center px-2"}
                `}
                title={!extended && !isMobile ? "Activity" : ""}
              >
                <img
                  src={assets.history_icon}
                  alt="activity"
                  className="w-5 h-5 filter brightness-0 invert opacity-70 flex-shrink-0"
                />
                {(extended || isMobile) && <span>Activity</span>}
              </button>
              <button
                className={`
                  flex items-center gap-3 p-2 px-3 rounded-lg
                  cursor-pointer text-sm text-gray-300
                  hover:bg-gray-700 transition-colors
                  ${!extended && !isMobile && "justify-center px-2"}
                `}
                title={!extended && !isMobile ? "Settings" : ""}
              >
                <img
                  src={assets.setting_icon}
                  alt="settings"
                  className="w-5 h-5 filter brightness-0 invert opacity-70 flex-shrink-0"
                />
                {(extended || isMobile) && <span>Settings</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;