import React, { useState, useEffect } from 'react';
import { FaSearch, FaUserGraduate, FaBirthdayCake, FaUserFriends } from 'react-icons/fa';
import API_URL from '../../config/api';

const StudentManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [students, setStudents] = useState([]);
  const [homeroomClass, setHomeroomClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [parentAccounts, setParentAccounts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch all classes
        const classResponse = await fetch(`${API_URL}/api/Class`);
        if (!classResponse.ok) {
          throw new Error('Failed to fetch classes data');
        }
        const classData = await classResponse.json();
        // Tìm lớp mà giáo viên này làm chủ nhiệm
        const foundClass = classData.find(cls => cls.teacherhomeroomid === user.teacherId);
        setHomeroomClass(foundClass || null);
        if (foundClass) {
          // Fetch all students
          const studentResponse = await fetch(`${API_URL}/api/Student`);
          if (!studentResponse.ok) {
            throw new Error('Failed to fetch students data');
          }
          const studentData = await studentResponse.json();
          // Lọc học sinh thuộc lớp chủ nhiệm
          const filteredStudents = studentData.filter(student => student.classid === foundClass.classid);
          setStudents(filteredStudents);
          // Fetch all parent accounts
          const parentRes = await fetch(`${API_URL}/api/UserAccount/GetAllUserAccounts`);
          const parentData = await parentRes.json();
          setParentAccounts(parentData);
        } else {
          setStudents([]);
          setParentAccounts([]);
        }
        setError(null);
      } catch (err) {
        setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.teacherId]);

  // Format date to Vietnamese format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  // Filter students based on search term
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <FaUserGraduate className="text-3xl text-blue-600 mr-3" />
          <h2 className="text-2xl font-semibold text-gray-800">Quản lý học sinh</h2>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm học sinh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
          />
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải danh sách học sinh...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
        </div>
      ) : !homeroomClass ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-600">
          Bạn chưa được phân công làm giáo viên chủ nhiệm lớp nào.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b">
            <span className="text-base text-gray-700 font-semibold">Lớp chủ nhiệm: {homeroomClass.classname}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Họ và tên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày sinh
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lớp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phụ huynh
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      Không tìm thấy học sinh nào
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => (
                    <tr 
                      key={student.studentid}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <FaUserGraduate className="text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {student.studentid}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaBirthdayCake className="text-pink-500 mr-2" />
                          <span className="text-sm text-gray-900">
                            {formatDate(student.dateofbirth)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {homeroomClass.classname}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaUserFriends className="text-gray-500 mr-2" />
                          <span className="text-sm text-gray-900">
                            {(() => {
                              const parent = parentAccounts.find(acc => acc.userid === student.parentid);
                              return parent ? (
                                <span>
                                  <b>{parent.fullname}</b><br/>
                                  Email: {parent.email || 'Không có'}<br/>
                                  SDT: {parent.phonenumber || 'Không có'}
                                </span>
                              ) : (
                                <span className="text-gray-400">Chưa có thông tin</span>
                              );
                            })()}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t">
            <p className="text-sm text-gray-600">
              Tổng số học sinh: {filteredStudents.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;