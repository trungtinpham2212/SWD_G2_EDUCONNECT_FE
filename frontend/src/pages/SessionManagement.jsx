import React, { useEffect, useState } from 'react';
import API_URL from '../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SessionManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [form, setForm] = useState({
    subjectid: '',
    classid: '',
    teacherid: '',
    periodno: '',
    perioddate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const totalPages = Math.ceil(sections.length / itemsPerPage);
  const currentSections = sections.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sectionRes, subjectRes, classRes, teacherRes, userRes] = await Promise.all([
          fetch(`${API_URL}/api/Period`),
          fetch(`${API_URL}/api/Subject`),
          fetch(`${API_URL}/api/Class`),
          fetch(`${API_URL}/api/Teacher`),
          fetch(`${API_URL}/api/UserAccount/GetAllUserAccounts`)
        ]);
        const sectionData = await sectionRes.json();
        // Sort sections theo periodid giảm dần (mới nhất lên trước)
        sectionData.sort((a, b) => b.periodid - a.periodid);
        setSections(sectionData);
        setSubjects(await subjectRes.json());
        setClasses(await classRes.json());
        setTeachers(await teacherRes.json());
        setUserAccounts(await userRes.json());
        setError(null);
      } catch (err) {
        setError('Không thể tải dữ liệu tiết học. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getSubjectName = (subjectid) => {
    const s = subjects.find(sub => sub.subjectid === subjectid);
    return s ? s.subjectname : '-';
  };
  const getClassName = (classid) => {
    const c = classes.find(cls => cls.classid === classid);
    return c ? c.classname : '-';
  };
  const getTeacherName = (teacherid) => {
    const t = teachers.find(t => t.teacherid === teacherid);
    if (!t) return '-';
    const u = userAccounts.find(u => u.userid === t.userid);
    return u ? u.fullname : '-';
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const resetForm = () => {
    setForm({ subjectid: '', classid: '', teacherid: '', periodno: '', perioddate: '' });
    setEditSection(null);
  };

  const handleOpenModal = (section = null) => {
    if (section) {
      setEditSection(section);
      setForm({
        subjectid: section.subjectid,
        classid: section.classid,
        teacherid: section.teacherid,
        periodno: section.periodno,
        perioddate: section.perioddate ? section.perioddate.split('T')[0] : ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newForm = { ...form, [name]: value };
    
    // Kiểm tra trùng lịch khi thay đổi tiết, ngày hoặc lớp
    if (['periodno', 'perioddate', 'classid'].includes(name)) {
      const hasOverlap = isPeriodExists(
        newForm.periodno,
        newForm.perioddate,
        newForm.classid,
        editSection?.periodid
      );
      
      if (hasOverlap) {
        toast.error('Lớp này đã có tiết học vào thời gian này');
      }
    }
    
    setForm(newForm);
  };

  const isPeriodExists = (periodno, perioddate, classid, excludePeriodId = null) => {
    // Kiểm tra các tham số có hợp lệ không
    if (!periodno || !perioddate || !classid) return false;

    // Chuyển đổi ngày thành chuỗi YYYY-MM-DD để so sánh
    const dateToCheck = new Date(perioddate).toISOString().split('T')[0];
    
    return sections.some(section => {
      // Bỏ qua tiết học đang được sửa
      if (excludePeriodId && section.periodid === excludePeriodId) return false;
      
      // Chuyển đổi ngày của tiết học đang kiểm tra
      const sectionDate = new Date(section.perioddate).toISOString().split('T')[0];
      
      // So sánh tiết số, ngày và lớp
      return Number(periodno) === section.periodno && 
             dateToCheck === sectionDate &&
             Number(classid) === section.classid;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate dữ liệu đầu vào
    if (!form.periodno || !form.perioddate || !form.classid) {
      toast.error('Vui lòng điền đầy đủ thông tin tiết học');
      return;
    }

    // Kiểm tra trùng lịch
    const hasOverlap = isPeriodExists(
      form.periodno,
      form.perioddate,
      form.classid,
      editSection?.periodid
    );

    if (hasOverlap) {
      toast.error('Lớp này đã có tiết học vào thời gian này');
      return;
    }

    try {
      setLoading(true);
      const method = editSection ? 'PUT' : 'POST';
      const url = editSection ? `${API_URL}/api/Period/${editSection.periodid}` : `${API_URL}/api/Period`;
      
      const body = {
        periodid: editSection ? editSection.periodid : 0,
        subjectid: Number(form.subjectid),
        classid: Number(form.classid),
        teacherid: Number(form.teacherid),
        periodno: Number(form.periodno),
        perioddate: form.perioddate
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || 'Lưu tiết học thất bại');
      }

      // Reload data
      const sectionRes = await fetch(`${API_URL}/api/Period`);
      const sectionData = await sectionRes.json();
      sectionData.sort((a, b) => b.periodid - a.periodid);
      setSections(sectionData);
      
      setShowModal(false);
      resetForm();
      toast.success('Lưu tiết học thành công!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (periodid) => {
    setSectionToDelete(periodid);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/Period/${sectionToDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa tiết học thất bại');
      setSections(sections.filter(s => s.periodid !== sectionToDelete));
      toast.success('Xóa tiết học thành công!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setSectionToDelete(null);
    }
  };

  // Lọc giáo viên theo môn học đã chọn
  const filteredTeachers = form.subjectid ? teachers.filter(t => t.subjectid === Number(form.subjectid)) : [];

  return (
    <div className="flex-1 p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-semibold mb-6">Quản lý tiết học</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4 flex justify-end">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => handleOpenModal()}
          >
            Thêm tiết học
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Môn học</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lớp</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giáo viên</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiết</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentSections.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-4 text-center text-gray-500">Không có tiết học nào</td>
                  </tr>
                ) : (
                  currentSections.map((s, idx) => (
                    <tr key={s.periodid}>
                      <td className="px-4 py-2 text-sm text-gray-500">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{getSubjectName(s.subjectid)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{getClassName(s.classid)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{getTeacherName(s.teacherid)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{s.periodno}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{s.perioddate ? new Date(s.perioddate).toLocaleDateString('vi-VN') : '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <button
                          className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 mr-2"
                          onClick={() => handleOpenModal(s)}
                        >
                          Sửa
                        </button>
                        <button
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          onClick={() => handleDelete(s.periodid)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex justify-center mt-4">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 mx-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Modal thêm/sửa */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">{editSection ? 'Sửa tiết học' : 'Thêm tiết học'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Môn học</label>
                <select
                  name="subjectid"
                  value={form.subjectid}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Chọn môn học --</option>
                  {subjects.map(sub => (
                    <option key={sub.subjectid} value={sub.subjectid}>{sub.subjectname}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Lớp</label>
                <select
                  name="classid"
                  value={form.classid}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${
                    form.classid && form.periodno && form.perioddate && 
                    isPeriodExists(form.periodno, form.perioddate, form.classid, editSection?.periodid) 
                      ? 'border-red-500' 
                      : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  required
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map(cls => (
                    <option key={cls.classid} value={cls.classid}>{cls.classname}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Giáo viên</label>
                <select
                  name="teacherid"
                  value={form.teacherid}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!form.subjectid}
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {filteredTeachers.map(t => {
                    const u = userAccounts.find(u => u.userid === t.userid);
                    return (
                      <option key={t.teacherid} value={t.teacherid}>{u ? u.fullname : `GV ${t.teacherid}`}</option>
                    );
                  })}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tiết</label>
                <select
                  name="periodno"
                  value={form.periodno}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${
                    form.classid && form.periodno && form.perioddate && 
                    isPeriodExists(form.periodno, form.perioddate, form.classid, editSection?.periodid) 
                      ? 'border-red-500' 
                      : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  required
                >
                  <option value="">-- Chọn tiết --</option>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>Tiết {num}</option>
                  ))}
                </select>
                {form.classid && form.periodno && form.perioddate && 
                 isPeriodExists(form.periodno, form.perioddate, form.classid, editSection?.periodid) && (
                  <p className="mt-1 text-sm text-red-600">Lớp này đã có tiết học vào thời gian này</p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ngày</label>
                <input
                  type="date"
                  name="perioddate"
                  value={form.perioddate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${
                    form.classid && form.periodno && form.perioddate && 
                    isPeriodExists(form.periodno, form.perioddate, form.classid, editSection?.periodid) 
                      ? 'border-red-500' 
                      : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  required
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={
                    loading || 
                    !form.classid || 
                    !form.periodno || 
                    !form.perioddate ||
                    isPeriodExists(form.periodno, form.perioddate, form.classid, editSection?.periodid)
                  }
                >
                  {editSection ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal xác nhận xóa */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Xác nhận xóa</h3>
            <p className="mb-4">Bạn có chắc chắn muốn xóa tiết học này?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={loading}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManagement;