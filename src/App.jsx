import React, { useState, useEffect, useCallback } from "react";
import Main from "./Components/Main/Main";
import Sidebar from "./Components/Sidebar/Sidebar";

// One breakpoint shared by App, Sidebar and Main (Tailwind's `md`)
const MOBILE_BREAKPOINT = 768;

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [sidebarExtended, setSidebarExtended] = useState(true); // desktop expanded/collapsed
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const apply = () => {
      setIsMobile(mq.matches);
      if (!mq.matches) setSidebarOpen(false); // close drawer when going to desktop
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Lock background scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isMobile && sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, sidebarOpen]);

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);
  const toggleSidebarExtended = useCallback(() => setSidebarExtended((p) => !p), []);

  return (
    <div className="w-full h-[100dvh] overflow-hidden bg-white">
      <Sidebar
        isMobile={isMobile}
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        extended={sidebarExtended}
        toggleExtended={toggleSidebarExtended}
      />
      <Main
        isMobile={isMobile}
        sidebarExtended={sidebarExtended}
        toggleSidebar={toggleSidebar}
      />
    </div>
  );
};

export default App;
