import React, { useEffect, useState } from 'react';
import API_URL from '../config/api';

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
  const [createForm, setCreateForm] = useState({
    classname: '',
    teacherhomeroomid: '',
    schoolyearid: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [classRes, teacherRes, userRes, yearRes, studentRes] = await Promise.all([
          fetch(`${API_URL}/api/Class`),
          fetch(`${API_URL}/api/Teacher`),
          fetch(`${API_URL}/api/UserAccount/GetAllUserAccounts`),
          fetch(`${API_URL}/api/SchoolYear`),
          fetch(`${API_URL}/api/Student`)
        ]);
        const classData = await classRes.json();
        const teacherData = await teacherRes.json();
        const userData = await userRes.json();
        const yearData = await yearRes.json();
        const studentData = await studentRes.json();
        setClasses(classData);
        setTeachers(teacherData);
        setUserAccounts(userData);
        setSchoolYears(yearData);
        setStudents(studentData);
        setError(null);
      } catch (err) {
        setError('Không thể tải dữ liệu lớp học. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTeacherName = (teacherid) => {
    const teacher = teachers.find(t => t.teacherid === teacherid);
    if (!teacher) return '-';
    const user = userAccounts.find(u => u.userid === teacher.userid);
    return user ? user.fullname : '-';
  };

  const getSchoolYear = (schoolyearid) => {
    const year = schoolYears.find(y => y.schoolyearid === schoolyearid);
    return year ? year.year : '-';
  };

  const getStudentsOfClass = (classid) => {
    return students.filter(stu => stu.classid === classid);
  };

  const handleShowStudents = (classid, classname) => {
    setModalStudents(getStudentsOfClass(classid));
    setModalClassName(classname);
    setShowStudentModal(true);
  };

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm({ ...createForm, [name]: value });
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      // Tạo lớp mới
      const res = await fetch(`${API_URL}/api/Class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classname: createForm.classname,
          teacherhomeroomid: createForm.teacherhomeroomid,
          schoolyearid: createForm.schoolyearid
        })
      });
      if (!res.ok) throw new Error('Tạo lớp thất bại');
      setShowCreateModal(false);
      setCreateForm({ classname: '', teacherhomeroomid: '', schoolyearid: '' });
      await fetchData();
      window.toast && window.toast.success('Tạo lớp thành công!');
    } catch (error) {
      window.toast && window.toast.error('Có lỗi khi tạo lớp: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 p-6">
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-4 text-center text-gray-500">Không có lớp nào</td>
                  </tr>
                ) : (
                  classes.map((cls, idx) => {
                    const homeroomTeacher = getTeacherName(cls.teacherhomeroomid);
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
                <input type="text" name="classname" value={createForm.classname} onChange={handleCreateChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Giáo viên chủ nhiệm</label>
                <select name="teacherhomeroomid" value={createForm.teacherhomeroomid} onChange={handleCreateChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map(t => {
                    const user = userAccounts.find(u => u.userid === t.userid);
                    return <option key={t.teacherid} value={t.teacherid}>{user ? user.fullname : 'GV ' + t.teacherid}</option>;
                  })}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Năm học</label>
                <select name="schoolyearid" value={createForm.schoolyearid} onChange={handleCreateChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                  <option value="">-- Chọn năm học --</option>
                  {schoolYears.map(y => (
                    <option key={y.schoolyearid} value={y.schoolyearid}>{y.year}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end mt-6">
                <button type="button" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700 mr-2" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={creating}>{creating ? 'Đang lưu...' : 'Lưu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;