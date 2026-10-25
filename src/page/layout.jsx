import { useState } from "react";
import { FaBars } from "react-icons/fa";
import "./AdminLayout.css";

import Sidebar from './Components/Sidebar/Sidebar'
import Main from './Components/Main/Main';
const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="admin-layout">
      {/* Mobile Top Bar */}
      <div className="topbar">
        <button className="menu-button" onClick={toggleSidebar}>
          <FaBars size={24} />
        </button>
        <h1 className="topbar-title">Admin Panel</h1>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="overlay" onClick={toggleSidebar}></div>
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="main-content">
        <Main />
      </div>
    </div>
  );
};

export default AdminLayout;
