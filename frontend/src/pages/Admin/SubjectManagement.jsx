import React, { useEffect, useState } from 'react';
import API_URL from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SubjectManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ subjectname: '' });
  const [editingSubject, setEditingSubject] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  // Helper lấy token từ localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subjectRes, teacherRes, userRes] = await Promise.all([
        fetch(`${API_URL}/api/subjects?page=1&pageSize=15`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/teachers?page=1&pageSize=20`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/user-accounts`, { headers: getAuthHeaders() })
      ]);
      const subjectDataRaw = await subjectRes.json();
      const teacherDataRaw = await teacherRes.json();
      const userData = await userRes.json();
      const subjectData = Array.isArray(subjectDataRaw.items) ? subjectDataRaw.items : [];
      const teacherData = Array.isArray(teacherDataRaw.items) ? teacherDataRaw.items : [];
      setSubjects(subjectData);
      setTeachers(teacherData);
      setUserAccounts(userData);
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

  const handleOpenModal = (subject = null) => {
    if (subject) {
      setForm({ subjectname: subject.subjectname });
      setEditingSubject(subject);
    } else {
      setForm({ subjectname: '' });
      setEditingSubject(null);
    }
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Kiểm tra tên môn học trống
    if (!form.subjectname.trim()) {
      toast.error('Tên môn học không được để trống');
      return;
    }

    // Chuẩn hóa tên môn học (loại bỏ khoảng trắng thừa và chuyển về chữ thường)
    const normalizedNewName = form.subjectname.trim().toLowerCase();

    // Kiểm tra trùng tên với các môn học khác
    const isDuplicate = subjects.some(subject => {
      // Bỏ qua môn học đang được sửa
      if (editingSubject && subject.subjectid === editingSubject.subjectid) {
        return false;
      }
      const normalizedExistingName = subject.subjectname.trim().toLowerCase();
      return normalizedExistingName === normalizedNewName;
    });

    if (isDuplicate) {
      toast.error('Tên môn học này đã tồn tại');
      return;
    }

    try {
      if (editingSubject) {
        const response = await fetch(`${API_URL}/api/subjects/${editingSubject.subjectid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            subjectid: editingSubject.subjectid,
            subjectname: form.subjectname,
            sections: editingSubject.sections,
            teachers: editingSubject.teachers
          })
        });
        if (response.ok) {
          await fetchData();
          setShowModal(false);
          toast.success('Cập nhật môn học thành công!');
        } else {
          const errorText = await response.text();
          toast.error('Có lỗi xảy ra khi cập nhật môn học: ' + errorText);
        }
      } else {
        const response = await fetch(`${API_URL}/api/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            subjectname: form.subjectname,
            sections: [],
            teachers: []
          })
        });
        if (response.ok) {
          await fetchData();
          setShowModal(false);
          toast.success('Thêm môn học thành công!');
        } else {
          const errorText = await response.text();
          toast.error('Có lỗi xảy ra khi thêm môn học: ' + errorText);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi lưu môn học.');
    }
  };

  const handleDelete = (subjectId) => {
    setSubjectToDelete(subjectId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/api/subjects/${subjectToDelete}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        await fetchData();
        toast.success('Xóa môn học thành công!');
      } else {
        const errorText = await response.text();
        toast.error('Có lỗi xảy ra khi xóa môn học: ' + errorText);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xóa môn học.');
    } finally {
      setShowDeleteModal(false);
      setSubjectToDelete(null);
    }
  };

  // Lấy danh sách giáo viên dạy môn này
  const getTeachersOfSubject = (subject) => {
    const filteredTeachers = subject && Array.isArray(subject.teachers) ? subject.teachers : [];
    return filteredTeachers.map(t => {
      const user = userAccounts.find(u => u.userid === t.userid);
      return user ? user.fullname : `GV ${t.teacherid}`;
    });
  };

  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Quản lý môn học</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => handleOpenModal()}>Thêm môn học</button>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách môn học...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên môn học</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giáo viên</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(subjects) ? subjects.map((subject, idx) => (
                  <tr key={subject.subjectid}>
                    <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{subject.subjectname}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {getTeachersOfSubject(subject).length === 0 ? (
                        <span className="text-gray-400">Chưa có giáo viên</span>
                      ) : (
                        <ul className="list-disc ml-4">
                          {getTeachersOfSubject(subject).map((teacher, index) => (
                            <li key={index}>{teacher}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <button className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 mr-2" onClick={() => handleOpenModal(subject)}>Sửa</button>
                      <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700" onClick={() => handleDelete(subject.subjectid)}>Xóa</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-4 text-center text-gray-500">Không có môn học nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Modal thêm/sửa môn học */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">{editingSubject ? 'Sửa môn học' : 'Thêm môn học mới'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Tên môn học</label>
                <input type="text" name="subjectname" value={form.subjectname} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div className="flex justify-end mt-6">
                <button type="button" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700 mr-2" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ToastContainer />
      {/* Modal xác nhận xóa môn học */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Xác nhận xóa môn học</h3>
            <p>Bạn có chắc chắn muốn xóa môn học này không?</p>
            <div className="flex justify-end mt-6 gap-2">
              <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700" onClick={() => setShowDeleteModal(false)}>Hủy</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" onClick={confirmDelete}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManagement;