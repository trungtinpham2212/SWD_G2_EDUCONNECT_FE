import React from 'react';

const TeacherSetting = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Cài đặt giáo viên</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Nội dung cài đặt giáo viên sẽ được thêm vào đây</p>
      </div>
    </div>
  );
};

export default TeacherSetting;
