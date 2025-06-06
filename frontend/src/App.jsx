import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";

function App() {
  const [active, setActive] = useState("Trang chủ");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  // Wrapper function to handle user state and reset active menu
  const handleSetUser = (userData) => {
    setUser(userData);
    setActive("Trang chủ"); // Reset active menu to Trang chủ whenever user data changes
  };

  const Dashboard = () => {
    if (!user) {
      return <Navigate to="/login" />;
    }

    return (
      <div className="flex bg-gray-100 min-h-screen">
        <Sidebar
          active={active}
          setActive={setActive}
          isOpen={isSidebarOpen}
          setIsOpen={setSidebarOpen}
          user={user}
        />
        <div className="flex-1 p-6">
          <h2 className="text-2xl font-semibold mb-6">Trang: {active}</h2>
          {/* Nội dung động tùy theo mục được chọn */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600">
              Chào mừng bạn đến với hệ thống quản lý giáo dục EduConnect
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setUser={handleSetUser} />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
