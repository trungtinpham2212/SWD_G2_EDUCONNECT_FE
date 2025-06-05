import React, { useState } from "react";
import { FaTachometerAlt, FaChalkboardTeacher, FaUserFriends, FaUserGraduate, FaChartBar, FaCog, FaBars, FaSignOutAlt } from "react-icons/fa";

const menuItems = [
  { name: "Trang chủ", icon: <FaTachometerAlt /> },
  { name: "Giáo viên", icon: <FaChalkboardTeacher /> },
  { name: "Phụ huynh", icon: <FaUserFriends /> },
  { name: "Học sinh", icon: <FaUserGraduate /> },
  { name: "Báo cáo", icon: <FaChartBar /> },
  { name: "Cài đặt", icon: <FaCog /> },
];

const Sidebar = ({ active, setActive }) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleLogout = () => {
    // Xử lý logout ở đây
    console.log("Logging out...");
  };

  return (
    <div className={`bg-white shadow-xl h-screen ${isOpen ? "w-64" : "w-20"} transition-all duration-300 relative`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <h1 className={`text-xl font-bold ${isOpen ? "block" : "hidden"}`}>
          <span className="text-blue-600">Edu</span>
          <span className="text-gray-800">Connect</span>
        </h1>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors duration-200"
        >
          <FaBars className="text-lg" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3">
        <ul className="space-y-2">
          {menuItems.map((item, index) => (
            <li key={index}>
              <button
                onClick={() => setActive(item.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${active === item.name 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"
                  }
                  ${active === item.name && !isOpen ? "bg-blue-600" : ""}
                `}
              >
                <span className={`text-xl ${
                  active === item.name ? "text-white" : "text-gray-500 group-hover:text-blue-600"
                }`}>
                  {item.icon}
                </span>
                <span className={`${isOpen ? "opacity-100" : "opacity-0 w-0"} font-medium transition-all duration-200`}>
                  {item.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer with Logout */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100">
        <div className="p-4">
          <div className={`flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
            <div className="flex items-center min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-medium">
                A
              </div>
              {isOpen && (
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">Admin</p>
                  <p className="text-xs text-gray-500 truncate">admin@educonnect.com</p>
                </div>
              )}
            </div>
            {isOpen && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors duration-200"
                title="Đăng xuất"
              >
                <FaSignOutAlt className="text-lg" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
