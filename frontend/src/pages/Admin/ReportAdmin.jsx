import React from 'react';

const ReportAdmin = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Báo cáo quản trị</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Nội dung báo cáo ADMIN sẽ được thêm vào đây</p>
      </div>
    </div>
  );
};

export default ReportAdmin;
