import React, { useState, useEffect } from 'react';
import Main from './Components/Main/Main';
import Sidebar from './Components/Sidebar/Sidebar';

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExtended, setSidebarExtended] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 600;
      setIsMobile(mobile);
      // Close mobile sidebar when switching to desktop
      if (!mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
      // Auto-extend sidebar on desktop
      if (!mobile) {
        setSidebarExtended(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sidebarOpen]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const toggleSidebarExtended = () => {
    setSidebarExtended(prev => !prev);
  };

  // Calculate main content margin based on sidebar state
  const getMainMarginLeft = () => {
    if (isMobile) {
      return '0px'; // No margin on mobile
    }
    return sidebarExtended ? '256px' : '80px'; // 256px = w-64, 80px = w-20
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-gray-50">
      <Sidebar 
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        extended={sidebarExtended}
        toggleExtended={toggleSidebarExtended}
      />
      <Main 
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        sidebarExtended={sidebarExtended}
        toggleSidebar={toggleSidebar}
        mainMarginLeft={getMainMarginLeft()}
      />
    </div>
  );
};

export default App;