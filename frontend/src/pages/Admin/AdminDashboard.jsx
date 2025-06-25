import React from 'react';

const AdminDashboard = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Xin chào {user?.userName}, chúc bạn một ngày tốt lành!</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-blue-600 mb-4">Đây là Dashboard Admin</h3>
        <p className="text-gray-600">
          Chào mừng bạn đến với hệ thống quản lý giáo dục EduConnect - Trang quản trị
        </p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800">Quản lý hệ thống</h4>
            <p className="text-blue-600 text-sm">Quản lý người dùng, lớp học, môn học và năm học</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800">Báo cáo tổng quan</h4>
            <p className="text-green-600 text-sm">Xem thống kê và báo cáo của toàn bộ hệ thống</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-800">Cài đặt hệ thống</h4>
            <p className="text-purple-600 text-sm">Cấu hình và tùy chỉnh hệ thống</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
