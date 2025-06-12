import React from 'react';

const Dashboard = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Trang: {active}</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">
          Chào mừng bạn đến với hệ thống quản lý giáo dục EduConnect
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
