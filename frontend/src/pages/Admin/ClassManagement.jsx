import React, { useEffect, useState } from 'react';
import API_URL from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getTokenFromStorage, getAuthHeaders } from '../../utils/auth';

const ITEMS_PER_PAGE = 22;

const ClassManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [modalStudents, setModalStudents] = useState([]);
  const [modalClassName, setModalClassName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [form, setForm] = useState({
    classname: '',
    teacherhomeroomid: '',
    schoolyearid: ''
  });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);



  const fetchData = async () => {
    try {
      setLoading(true);
      const [classRes, teacherRes, userRes, yearRes, studentRes] = await Promise.all([
        fetch(`${API_URL}/api/classes?page=1&pageSize=10`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/teachers?page=1&pageSize=10`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/user-accounts`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/school-years`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/students?page=1&pageSize=${ITEMS_PER_PAGE}`, { headers: getAuthHeaders() })
        // 1 trang 10 lớp, mỗi lớp 40 học sinh
      ]);
      const classDataRaw = await classRes.json();
      const teacherDataRaw = await teacherRes.json();
      const userData = await userRes.json();
      const yearData = await yearRes.json();
      const studentDataRaw = await studentRes.json();
      setClasses(Array.isArray(classDataRaw.items) ? classDataRaw.items : []);
      setTeachers(Array.isArray(teacherDataRaw.items) ? teacherDataRaw.items : []);
      setUserAccounts(userData);
      setSchoolYears(yearData);
      setStudents(Array.isArray(studentDataRaw.items) ? studentDataRaw.items : []);
      setError(null);
    } catch (err) {
      setError('Không thể tải dữ liệu lớp học. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lấy tên giáo viên chủ nhiệm từ teacherhomeroomid
  const getHomeroomTeacherName = (teacherhomeroomid) => {
    if (!teacherhomeroomid) return '-';
    const teacher = teachers.find(t => t.teacherid === teacherhomeroomid);
    if (!teacher) return '-';
    const user = userAccounts.find(u => u.userid === teacher.userid);
    return user ? user.fullname : '-';
  };

  const getSchoolYear = (schoolyearid) => {
    const year = schoolYears.find(y => y.schoolyearid === schoolyearid);
    return year ? year.year : '-';
  };

  const getStudentsOfClass = (classid) => {
    return (Array.isArray(students) ? students : []).filter(stu => stu.classid === classid);
  };

  const handleShowStudents = (classid, classname) => {
    setModalStudents(getStudentsOfClass(classid));
    setModalClassName(classname);
    setShowStudentModal(true);
  };

  const getAvailableTeachers = (schoolyearid) => {
    if (!schoolyearid) return [];
    // Lấy danh sách các giáo viên đã làm chủ nhiệm trong năm học này
    const assignedTeachers = classes
      .filter(c => c.schoolyearid === Number(schoolyearid))
      .map(c => c.teacherhomeroomid);
    // Lọc ra các giáo viên chưa được phân công
    return (Array.isArray(teachers) ? teachers : []).filter(t => !assignedTeachers.includes(t.teacherid));
  };

  const isClassNameExists = (classname, schoolyearid, excludeClassId = null) => {
    return classes.some(c => 
      c.classname.toLowerCase() === classname.toLowerCase() && 
      c.schoolyearid === Number(schoolyearid) &&
      (!excludeClassId || c.classid !== excludeClassId)
    );
  };

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    // Nếu thay đổi năm học, reset giáo viên chủ nhiệm
    if (name === 'schoolyearid') {
      setForm({ ...form, [name]: value, teacherhomeroomid: '' });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (isClassNameExists(form.classname, form.schoolyearid)) {
      toast.error('Tên lớp này đã tồn tại trong năm học này');
      return;
    }
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('classname', form.classname);
      formData.append('teacherhomeroomid', form.teacherhomeroomid);
      formData.append('schoolyearid', form.schoolyearid);
      const res = await fetch(`${API_URL}/api/Class`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: formData
      });
      if (!res.ok) throw new Error('Tạo lớp thất bại');
      setShowCreateModal(false);
      setForm({ classname: '', teacherhomeroomid: '', schoolyearid: '' });
      await fetchData();
      toast.success('Tạo lớp thành công!');
    } catch (error) {
      toast.error('Có lỗi khi tạo lớp: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    if (isClassNameExists(form.classname, form.schoolyearid, editingClass.classid)) {
      toast.error('Tên lớp này đã tồn tại trong năm học này');
      return;
    }
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('classid', editingClass.classid);
      formData.append('classname', form.classname);
      formData.append('teacherhomeroomid', form.teacherhomeroomid);
      formData.append('schoolyearid', form.schoolyearid);
      const res = await fetch(`${API_URL}/api/Class/${editingClass.classid}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders() },
        body: formData
      });
      if (!res.ok) throw new Error('Cập nhật lớp thất bại');
      setShowEditModal(false);
      setForm({ classname: '', teacherhomeroomid: '', schoolyearid: '' });
      setEditingClass(null);
      await fetchData();
      toast.success('Cập nhật lớp thành công!');
    } catch (error) {
      toast.error('Có lỗi khi cập nhật lớp: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClass = async () => {
    try {
      const res = await fetch(`${API_URL}/api/Class/${classToDelete}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Xóa lớp thất bại');
      setShowDeleteModal(false);
      setClassToDelete(null);
      await fetchData();
      toast.success('Xóa lớp thành công!');
    } catch (error) {
      toast.error('Có lỗi khi xóa lớp: ' + error.message);
    }
  };

  const openEditModal = (cls) => {
    setEditingClass(cls);
    setForm({
      classname: cls.classname,
      teacherhomeroomid: cls.teacherhomeroomid,
      schoolyearid: cls.schoolyearid
    });
    setShowEditModal(true);
  };

  return (
    <div className="flex-1 p-6">
      <ToastContainer />
      <h2 className="text-2xl font-semibold mb-6">Quản lý lớp học</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setShowCreateModal(true)}>Thêm lớp học</button>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách lớp học...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên lớp</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giáo viên chủ nhiệm</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Năm học</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học sinh</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-gray-500">Không có lớp nào</td>
                  </tr>
                ) : (
                  classes.map((cls, idx) => {
                    const homeroomTeacher = getHomeroomTeacherName(cls.teacherhomeroomid);
                    const year = getSchoolYear(cls.schoolyearid);
                    const classStudents = getStudentsOfClass(cls.classid);
                    return (
                      <tr key={cls.classid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 font-semibold">{cls.classname}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{homeroomTeacher}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{year}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <button
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            onClick={() => handleShowStudents(cls.classid, cls.classname)}
                          >
                            Xem danh sách ({classStudents.length})
                          </button>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <button
                            className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 mr-2"
                            onClick={() => openEditModal(cls)}
                          >
                            Sửa
                          </button>
                          <button
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            onClick={() => {
                              setClassToDelete(cls.classid);
                              setShowDeleteModal(true);
                            }}
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal danh sách học sinh */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">Danh sách học sinh lớp {modalClassName}</h3>
            {modalStudents.length === 0 ? (
              <div className="text-gray-500">Không có học sinh nào trong lớp này.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và tên</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {modalStudents.map((stu, idx) => (
                      <tr key={stu.studentid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{stu.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700"
                onClick={() => setShowStudentModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal tạo lớp học */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">Tạo lớp học mới</h3>
            <form onSubmit={handleCreateClass}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Tên lớp</label>
                <input 
                  type="text" 
                  name="classname" 
                  value={form.classname} 
                  onChange={handleCreateChange} 
                  required 
                  className={`mt-1 block w-full border ${form.schoolyearid && isClassNameExists(form.classname, form.schoolyearid) ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                />
                {form.schoolyearid && isClassNameExists(form.classname, form.schoolyearid) && (
                  <p className="mt-1 text-sm text-red-600">Tên lớp này đã tồn tại trong năm học này</p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Năm học</label>
                <select 
                  name="schoolyearid" 
                  value={form.schoolyearid} 
                  onChange={handleCreateChange} 
                  required 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">-- Chọn năm học --</option>
                  {schoolYears.map(y => (
                    <option key={y.schoolyearid} value={y.schoolyearid}>{y.year}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Giáo viên chủ nhiệm</label>
                <select 
                  name="teacherhomeroomid" 
                  value={form.teacherhomeroomid} 
                  onChange={handleCreateChange} 
                  required 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  disabled={!form.schoolyearid}
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {getAvailableTeachers(form.schoolyearid).map(t => {
                    const user = userAccounts.find(u => u.userid === t.userid);
                    return <option key={t.teacherid} value={t.teacherid}>{user ? user.fullname : 'GV ' + t.teacherid}</option>;
                  })}
                </select>
                {form.schoolyearid && getAvailableTeachers(form.schoolyearid).length === 0 && (
                  <p className="mt-1 text-sm text-red-600">Không còn giáo viên nào có thể làm chủ nhiệm trong năm học này</p>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button type="button" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700 mr-2" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" 
                  disabled={creating || !form.schoolyearid || getAvailableTeachers(form.schoolyearid).length === 0}
                >
                  {creating ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal sửa lớp học */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">Sửa lớp học</h3>
            <form onSubmit={handleEditClass}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Tên lớp</label>
                <input 
                  type="text" 
                  name="classname" 
                  value={form.classname} 
                  onChange={handleCreateChange} 
                  required 
                  className={`mt-1 block w-full border ${form.schoolyearid && isClassNameExists(form.classname, form.schoolyearid, editingClass.classid) ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                />
                {form.schoolyearid && isClassNameExists(form.classname, form.schoolyearid, editingClass.classid) && (
                  <p className="mt-1 text-sm text-red-600">Tên lớp này đã tồn tại trong năm học này</p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Năm học</label>
                <select 
                  name="schoolyearid" 
                  value={form.schoolyearid} 
                  onChange={handleCreateChange} 
                  required 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">-- Chọn năm học --</option>
                  {schoolYears.map(y => (
                    <option key={y.schoolyearid} value={y.schoolyearid}>{y.year}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Giáo viên chủ nhiệm</label>
                <select 
                  name="teacherhomeroomid" 
                  value={form.teacherhomeroomid} 
                  onChange={handleCreateChange} 
                  required 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  disabled={!form.schoolyearid}
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {getAvailableTeachers(form.schoolyearid).map(t => {
                    const user = userAccounts.find(u => u.userid === t.userid);
                    return <option key={t.teacherid} value={t.teacherid}>{user ? user.fullname : 'GV ' + t.teacherid}</option>;
                  })}
                </select>
                {form.schoolyearid && getAvailableTeachers(form.schoolyearid).length === 0 && (
                  <p className="mt-1 text-sm text-red-600">Không còn giáo viên nào có thể làm chủ nhiệm trong năm học này</p>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button type="button" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700 mr-2" onClick={() => setShowEditModal(false)}>Hủy</button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" 
                  disabled={updating || !form.schoolyearid || getAvailableTeachers(form.schoolyearid).length === 0}
                >
                  {updating ? 'Đang lưu...' : 'Lưu'}
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
            <h3 className="text-lg font-semibold mb-4">Xác nhận xóa</h3>
            <p>Bạn có chắc chắn muốn xóa lớp học này không?</p>
            <div className="flex justify-end mt-6 gap-2">
              <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700" onClick={() => setShowDeleteModal(false)}>Hủy</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" onClick={handleDeleteClass}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;