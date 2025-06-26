import React, { useEffect, useState } from 'react';
import API_URL from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SchoolYearManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [schoolYears, setSchoolYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [nextSchoolYear, setNextSchoolYear] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const schoolYearRes = await fetch(`${API_URL}/api/school-years`);
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
      console.error(error);
      toast.error('Có lỗi xảy ra khi tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    try {
      const response = await fetch(`${API_URL}/api/SchoolYear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: nextSchoolYear })
      });
      if (response.ok) {
        await fetchData();
        setShowConfirmModal(false);
        toast.success('Thêm năm học thành công!');
      } else {
        const errorText = await response.text();
        toast.error('Có lỗi xảy ra khi thêm năm học: ' + errorText);
      }
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi lưu năm học.');
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
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