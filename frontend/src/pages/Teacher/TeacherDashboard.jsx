import React from 'react';

const TeacherDashboard = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Xin chào {user?.userName}, chúc bạn một ngày tốt lành!</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-green-600 mb-4">Đây là Dashboard Teacher</h3>
        <p className="text-gray-600">
          Chào mừng bạn đến với hệ thống quản lý giáo dục EduConnect - Trang giáo viên
        </p>
      </div>
    </div>
  );
};

export default TeacherDashboard;
