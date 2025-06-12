import React from 'react';

const ParentManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Quản lý phụ huynh</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Content will be added here */}
        <p className="text-gray-600">Nội dung quản lý phụ huynh sẽ được thêm vào đây</p>
      </div>
    </div>
  );
};

export default ParentManagement;