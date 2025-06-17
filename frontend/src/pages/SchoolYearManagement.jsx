import React, { useEffect, useState } from 'react';
import API_URL from '../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SchoolYearManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [schoolYears, setSchoolYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ year: '' });
  const [editingSchoolYear, setEditingSchoolYear] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [schoolYearToDelete, setSchoolYearToDelete] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const schoolYearRes = await fetch(`${API_URL}/api/SchoolYear`);
      const schoolYearData = await schoolYearRes.json();
      setSchoolYears(schoolYearData);
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

  const handleOpenModal = (schoolYear = null) => {
    if (schoolYear) {
      setForm({ year: schoolYear.year });
      setEditingSchoolYear(schoolYear);
    } else {
      setForm({ year: '' });
      setEditingSchoolYear(null);
    }
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSchoolYear) {
        const response = await fetch(`${API_URL}/api/SchoolYear/${editingSchoolYear.schoolyearid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolyearid: editingSchoolYear.schoolyearid,
            year: form.year
          })
        });
        if (response.ok) {
          await fetchData();
          setShowModal(false);
          toast.success('Cập nhật năm học thành công!');
        } else {
          const errorText = await response.text();
          toast.error('Có lỗi xảy ra khi cập nhật năm học: ' + errorText);
        }
      } else {
        const response = await fetch(`${API_URL}/api/SchoolYear`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year: form.year })
        });
        if (response.ok) {
          await fetchData();
          setShowModal(false);
          toast.success('Thêm năm học thành công!');
        } else {
          const errorText = await response.text();
          toast.error('Có lỗi xảy ra khi thêm năm học: ' + errorText);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi lưu năm học.');
    }
  };

  const handleDelete = (schoolYearId) => {
    setSchoolYearToDelete(schoolYearId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/api/SchoolYear/${schoolYearToDelete}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchData();
        toast.success('Xóa năm học thành công!');
      } else {
        const errorText = await response.text();
        toast.error('Có lỗi xảy ra khi xóa năm học: ' + errorText);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xóa năm học.');
    } finally {
      setShowDeleteModal(false);
      setSchoolYearToDelete(null);
    }
  };

  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Quản lý năm học</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => handleOpenModal()}>Thêm năm học</button>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schoolYears.map((schoolYear) => (
                  <tr key={schoolYear.schoolyearid}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schoolYear.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleOpenModal(schoolYear)}
                        className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 mr-2"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(schoolYear.schoolyearid)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal thêm/sửa năm học */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">{editingSchoolYear ? 'Sửa năm học' : 'Thêm năm học mới'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Năm học</label>
                <input
                  type="text"
                  name="year"
                  value={form.year}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: 2023-2024"
                  required
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingSchoolYear ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Xác nhận xóa</h3>
            <p className="mb-4">Bạn có chắc chắn muốn xóa năm học này?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Xóa
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