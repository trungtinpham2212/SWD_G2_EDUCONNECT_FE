import React, { useState, useEffect } from "react";
import { FaTachometerAlt, FaChalkboardTeacher, FaUserFriends, FaUserGraduate, FaChartBar, FaCog, FaBars, FaSignOutAlt, FaCalendarAlt, FaHistory, FaCaretDown, FaUserCog, FaCalendar, FaBook, FaChalkboard, FaClock, FaStar, FaComments } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import API_URL from '../config/api';


const getMenuItems = (roleId) => {
  const baseItems = [
    { name: "Trang chủ", icon: <FaTachometerAlt />, path: "/" },
  ];

  switch (roleId) {
    case 1: // Admin
      return [
        ...baseItems,
        { 
          name: "Quản lý tài khoản", 
          icon: <FaUserCog />,
          subItems: [
            { name: "Giáo viên", icon: <FaChalkboardTeacher />, path: "/teachers" },
            { name: "Phụ huynh", icon: <FaUserFriends />, path: "/parents" },
            { name: "Học sinh", icon: <FaUserGraduate />, path: "/admin/students" },
          ]
        },
        { name: "Quản lý năm học", icon: <FaCalendar />, path: "/school-years" },
        { name: "Quản lý môn học", icon: <FaBook />, path: "/subjects" },
        { name: "Quản lý lớp học", icon: <FaChalkboard />, path: "/classes" },
        { name: "Quản lý tiết học", icon: <FaClock />, path: "/sessions" },
        { name: "Quản lý đánh giá", icon: <FaStar />, path: "/admin/evaluations" },
        // { name: "Báo cáo", icon: <FaChartBar />, path: "/admin/reports" },
        { name: "Lịch sử hoạt động", icon: <FaHistory />, path: "/activity-logs" },
        { name: "Cài đặt", icon: <FaCog />, path: "/admin/settings" },
      ];
    case 2: // Giáo viên
      return [
        ...baseItems,
        { name: "Lịch giảng dạy", icon: <FaCalendarAlt />, path: "/teaching-schedule" },
        { name: "Học sinh", icon: <FaUserGraduate />, path: "/students" },
        { name: "Quản lý đánh giá", icon: <FaStar />, path: "/evaluations" },
        { name: "Báo cáo", icon: <FaChartBar />, path: "/teacher/reports" },
        { name: "Cài đặt", icon: <FaCog />, path: "/teacher/settings" },
      ];
    case 3: // Phụ huynh
      return [
        ...baseItems,
        { name: "Trợ lý AI", icon: <FaComments />, path: "/chatbot" },
        { name: "Cài đặt", icon: <FaCog />, path: "/parent/settings" },
      ];
    default:
      return baseItems;
  }

  
};

const Sidebar = ({ active, setActive, isOpen, setIsOpen, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);

  const menuItems = getMenuItems(user?.roleId);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    const fetchAvatar = async () => {
      if (user?.userId) {
        try {
          const res = await fetch(`${API_URL}/api/user-accounts/${user.userId}`);
          if (res.ok) {
            const data = await res.json();
            setAvatarUrl(data.avatarUrl || data.avatarurl || null);
          }
        } catch (e) {
          setAvatarUrl(null);
        }
      }
    };
    fetchAvatar();
  }, [user?.userId, user?.avatarUrl]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleMenuClick = (item) => {
    if (item.subItems) {
      setOpenDropdown(openDropdown === item.name ? null : item.name);
    } else {
      setActive(item.name);
      setOpenDropdown(null);
      navigate(item.path);
    }
  };

  // Set active based on current path
  React.useEffect(() => {
    const currentPath = location.pathname;
    const allItems = menuItems.flatMap(item => 
      item.subItems ? item.subItems : item
    );
    const currentItem = allItems.find(item => item.path === currentPath);
    if (currentItem) {
      setActive(currentItem.name);
    }
  }, [location.pathname, menuItems]);

  return (
    <div className={`bg-white shadow-xl h-screen ${isOpen ? "w-64" : "w-20"} transition-all duration-300 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
        <h1 className={`text-xl font-bold ${isOpen ? "block" : "hidden"}`}>
          <span className="text-blue-600">Edu</span>
          <span className="text-gray-800">Connect</span>
        </h1>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors duration-200"
        >
          <FaBars className="text-xl" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-2 px-3">
          {menuItems.map((item, index) => (
            <li key={index}>
              <div className="relative">
                <button
                  onClick={() => handleMenuClick(item)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200
                    ${(active === item.name || openDropdown === item.name)
                      ? "bg-blue-600 text-white shadow-md" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"
                    }
                  `}
                >
                  <div className="flex items-center min-w-0">
                    <span className={`text-xl ${
                      (active === item.name || openDropdown === item.name) ? "text-white" : "text-gray-500 group-hover:text-blue-600"
                    }`}>
                      {item.icon}
                    </span>
                    {isOpen && (
                      <span className="ml-3 font-medium truncate">
                        {item.name}
                      </span>
                    )}
                  </div>
                  {item.subItems && isOpen && (
                    <FaCaretDown className={`ml-2 transition-transform duration-200 ${openDropdown === item.name ? 'rotate-180' : ''}`} />
                  )}
                </button>
                
                {/* Dropdown Menu */}
                {item.subItems && isOpen && openDropdown === item.name && (
                  <div className="mt-1 ml-2 space-y-1">
                    {item.subItems.map((subItem, subIndex) => (
                      <button
                        key={subIndex}
                        onClick={() => {
                          setActive(subItem.name);
                          setOpenDropdown(null);
                          navigate(subItem.path);
                        }}
                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200
                          ${active === subItem.name 
                            ? "bg-blue-100 text-blue-600" 
                            : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"
                          }
                        `}
                      >
                        <span className="text-xl">{subItem.icon}</span>
                        <span className="ml-3 font-medium">{subItem.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer with User Info and Logout */}
      <div className="border-t border-gray-100 mt-auto">
        <div className="p-4">
          {isOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover border-2 border-blue-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-medium">
                    {user?.userName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{user?.userName || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || 'user@educonnect.com'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors duration-200"
                title="Đăng xuất"
              >
                <FaSignOutAlt className="text-xl" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors duration-200"
                title="Đăng xuất"
              >
                <FaSignOutAlt className="text-xl" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
