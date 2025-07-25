import React, { useState, useEffect } from 'react';
import { FaSearch, FaUserGraduate, FaBirthdayCake, FaUserFriends } from 'react-icons/fa';
import API_URL from '../../config/api';
import { getTokenFromStorage, getAuthHeaders, removeToken } from '../../utils/auth';

const StudentManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const ITEMS_PER_PAGE = 15;
  const [students, setStudents] = useState([]);
  const [homeroomClass, setHomeroomClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [parentAccounts, setParentAccounts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Lấy lớp chủ nhiệm
  useEffect(() => {
    const fetchHomeroomClass = async () => {
      try {
        setLoading(true);
        const classRes = await fetch(`${API_URL}/api/classes?page=1&pageSize=100`, { headers: getAuthHeaders() });
        if (classRes.status === 401 || classRes.status === 403) {
          removeToken();
          setError('Phiên đăng nhập đã hết hạn hoặc không đủ quyền. Vui lòng đăng nhập lại.');
          setLoading(false);
          return;
        }
        const classData = await classRes.json();
        const foundClass = Array.isArray(classData.items)
          ? classData.items.find(cls => cls.teacherhomeroomid === user.teacherId)
          : null;
        setHomeroomClass(foundClass || null);
        if (!foundClass) {
          setStudents([]);
          setTotalCount(0);
          setTotalPages(1);
          setError('Bạn chưa được phân công làm giáo viên chủ nhiệm lớp nào.');
        } else {
          setError(null);
        }
      } catch (err) {
        setError('Không thể tải dữ liệu lớp chủ nhiệm. Vui lòng thử lại sau.');
        setHomeroomClass(null);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeroomClass();
  }, [user.teacherId]);

  // Lấy danh sách học sinh mỗi khi class, page, searchTerm thay đổi
  useEffect(() => {
    const fetchStudents = async () => {
      if (!homeroomClass) return;
      try {
        setLoading(true);
        let url = `${API_URL}/api/students?teacherId=${user.teacherId}&classId=${homeroomClass.classid}&page=${currentPage}&pageSize=${ITEMS_PER_PAGE}`;
        if (searchTerm) {
          url += `&name=${encodeURIComponent(searchTerm)}`;
        }
        const studentRes = await fetch(url, { headers: getAuthHeaders() });
        if (studentRes.status === 401 || studentRes.status === 403) {
          removeToken();
          setError('Phiên đăng nhập đã hết hạn hoặc không đủ quyền. Vui lòng đăng nhập lại.');
          setLoading(false);
          return;
        }
        const studentData = await studentRes.json();
        setStudents(Array.isArray(studentData.items) ? studentData.items : []);
        setTotalCount(studentData.totalCount || 0);
        setTotalPages(Math.max(1, Math.ceil((studentData.totalCount || 0) / ITEMS_PER_PAGE)));
        setError(null);
      } catch (err) {
        setError('Không thể tải danh sách học sinh. Vui lòng thử lại sau.');
        setStudents([]);
        setTotalCount(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };
    if (homeroomClass) {
      fetchStudents();
    }
  }, [homeroomClass, currentPage, searchTerm, user.teacherId]);

  // Lấy danh sách phụ huynh
  useEffect(() => {
    const fetchParents = async () => {
      try {
        const parentRes = await fetch(`${API_URL}/api/user-accounts`, { headers: getAuthHeaders() });
        if (parentRes.status === 401 || parentRes.status === 403) {
          removeToken();
          setError('Phiên đăng nhập đã hết hạn hoặc không đủ quyền. Vui lòng đăng nhập lại.');
          return;
        }
        const parentData = await parentRes.json();
        setParentAccounts(parentData);
      } catch (err) {
        // Không cần setError ở đây vì không ảnh hưởng chính
      }
    };
    fetchParents();
  }, []);

  // Format date to Vietnamese format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Khi searchTerm thay đổi, reset về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      Không tìm thấy học sinh nào
                    </td>
                  </tr>
                ) : (
                  students.map((student, index) => (
                    <tr 
                      key={student.studentid}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <FaUserGraduate className="text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.studentName}
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
                          {student.class?.classname || ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaUserFriends className="text-gray-500 mr-2" />
                          <span className="text-sm text-gray-900">
                            {student.parent ? (
                              <span>
                                <b>{student.parent.fullname}</b><br/>
                                Email: {student.parent.email || 'Không có'}<br/>
                                SDT: {student.parent.phonenumber || 'Không có'}
                              </span>
                            ) : (
                              <span className="text-gray-400">Chưa có thông tin</span>
                            )}
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
              Tổng số học sinh: {totalCount}
            </p>
          </div>
          <div className="px-6 py-4 border-t">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-200 text-gray-500 rounded-md"
              >&lt;</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={`px-3 py-1 ${currentPage === i + 1 ? 'bg-blue-500 text-white' : 'text-gray-500'} rounded-md`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-200 text-gray-500 rounded-md"
              >&gt;</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;