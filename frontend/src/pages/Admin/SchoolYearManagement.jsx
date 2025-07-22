import React, { useEffect, useState } from 'react';
import API_URL from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getTokenFromStorage, getAuthHeaders } from '../../utils/auth';

const SchoolYearManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [schoolYears, setSchoolYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [nextSchoolYear, setNextSchoolYear] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra token trước khi gọi API
      const token = getTokenFromStorage();
      if (!token) {
        setError('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        toast.error('Vui lòng đăng nhập lại');
        return;
      }

      const schoolYearRes = await fetch(`${API_URL}/api/school-years`, {
        headers: getAuthHeaders()
      });

      // Kiểm tra lỗi 401
      if (schoolYearRes.status === 401) {
        localStorage.removeItem('token');
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      if (!schoolYearRes.ok) {
        throw new Error(`HTTP error! Status: ${schoolYearRes.status}`);
      }

      const schoolYearData = await schoolYearRes.json();
      setSchoolYears(schoolYearData);

      // Tìm năm học lớn nhất
      if (schoolYearData.length > 0) {
        const maxYear = schoolYearData.reduce((max, year) => {
          const endYear = parseInt(year.year.split('-')[1]);
          return endYear > max ? endYear : max;
        }, 0);
        setNextSchoolYear(`${maxYear}-${maxYear + 1}`);
      }

      setError(null);
    } catch (error) {
      console.error('Fetch error:', error);
      if (error.message.includes('401')) {
        localStorage.removeItem('token');
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setError('Có lỗi xảy ra khi tải dữ liệu: ' + error.message);
        toast.error('Có lỗi xảy ra khi tải dữ liệu: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getTokenFromStorage();
    
    if (!token) {
      setError('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
      setLoading(false);
      return;
    }
    
    fetchData();
  }, []);

  const handleSubmit = async () => {
    try {
      const token = getTokenFromStorage();
      if (!token) {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      const response = await fetch(`${API_URL}/api/SchoolYear`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ year: nextSchoolYear })
      });

      // Kiểm tra lỗi 401
      if (response.status === 401) {
        localStorage.removeItem('token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      if (response.ok) {
        await fetchData();
        setShowConfirmModal(false);
        toast.success('Thêm năm học thành công!');
      } else {
        const errorText = await response.text();
        toast.error('Có lỗi xảy ra khi thêm năm học: ' + errorText);
      }
    } catch (error) {
      console.error('Submit error:', error);
      if (error.message.includes('401') || error.status === 401) {
        localStorage.removeItem('token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        toast.error('Có lỗi xảy ra khi lưu năm học: ' + error.message);
      }
    }
  };

  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Quản lý năm học</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <button 
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" 
          onClick={() => setShowConfirmModal(true)}
        >
          Thêm năm học
        </button>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách năm học...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Lỗi xác thực</h3>
                <p className="mt-1 text-sm text-red-600">{error}</p>
                {error.includes('token') && (
                  <div className="mt-3">
                    <button 
                      onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                      }}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Đăng nhập lại
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Năm học</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schoolYears.map((schoolYear) => (
                  <tr key={schoolYear.schoolyearid}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schoolYear.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal xác nhận thêm năm học mới */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Xác nhận thêm năm học</h3>
            <p className="mb-4">Bạn có chắc chắn muốn tạo năm học {nextSchoolYear}?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

export default SchoolYearManagement;