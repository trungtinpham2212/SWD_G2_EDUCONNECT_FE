import React, { useEffect, useState } from 'react';
import API_URL from '../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SchoolYearManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [schoolYears, setSchoolYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ year: '' });
  const [editingSchoolYear, setEditingSchoolYear] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [schoolYearToDelete, setSchoolYearToDelete] = useState(null);
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [semesterForm, setSemesterForm] = useState({ semestername: '', startdate: '', enddate: '' });
  const [editingSemester, setEditingSemester] = useState(null);
  const [semesterToDelete, setSemesterToDelete] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schoolYearRes, semesterRes] = await Promise.all([
        fetch(`${API_URL}/api/SchoolYear`),
        fetch(`${API_URL}/api/Semester`)
      ]);
      const schoolYearData = await schoolYearRes.json();
      const semesterData = await semesterRes.json();
      setSchoolYears(schoolYearData);
      setSemesters(semesterData);
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

  // SchoolYear CRUD
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

  // Semester CRUD
  const openSemesterModal = (schoolYear) => {
    setSelectedSchoolYear(schoolYear);
    setShowSemesterModal(true);
    setEditingSemester(null);
    setSemesterForm({ semestername: '', startdate: '', enddate: '' });
  };

  const handleSemesterChange = (e) => {
    setSemesterForm({ ...semesterForm, [e.target.name]: e.target.value });
  };

  const handleSemesterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSemester) {
        const response = await fetch(`${API_URL}/api/Semester/${editingSemester.semesterid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            semesterid: editingSemester.semesterid,
            semestername: semesterForm.semestername,
            schoolyearid: selectedSchoolYear.schoolyearid,
            startdate: semesterForm.startdate,
            enddate: semesterForm.enddate,
            schoolyear: null
          })
        });
        if (response.ok) {
          await fetchData();
          setShowSemesterModal(true);
          setEditingSemester(null);
          setSemesterForm({ semestername: '', startdate: '', enddate: '' });
          toast.success('Cập nhật học kỳ thành công!');
        } else {
          const errorText = await response.text();
          toast.error('Có lỗi xảy ra khi cập nhật học kỳ: ' + errorText);
        }
      } else {
        const response = await fetch(`${API_URL}/api/Semester`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            semestername: semesterForm.semestername,
            schoolyearid: selectedSchoolYear.schoolyearid,
            startdate: semesterForm.startdate,
            enddate: semesterForm.enddate,
            schoolyear: null
          })
        });
        if (response.ok) {
          await fetchData();
          setSemesterForm({ semestername: '', startdate: '', enddate: '' });
          toast.success('Thêm học kỳ thành công!');
        } else {
          const errorText = await response.text();
          toast.error('Có lỗi xảy ra khi thêm học kỳ: ' + errorText);
        }
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi lưu học kỳ.');
    }
  };

  const handleEditSemester = (semester) => {
    setEditingSemester(semester);
    setSemesterForm({
      semestername: semester.semestername,
      startdate: semester.startdate ? semester.startdate.substring(0, 10) : '',
      enddate: semester.enddate ? semester.enddate.substring(0, 10) : ''
    });
  };

  const handleDeleteSemester = (semesterid) => {
    setSemesterToDelete(semesterid);
  };

  const confirmDeleteSemester = async () => {
    try {
      const response = await fetch(`${API_URL}/api/Semester/${semesterToDelete}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchData();
        toast.success('Xóa học kỳ thành công!');
      } else {
        const errorText = await response.text();
        toast.error('Có lỗi xảy ra khi xóa học kỳ: ' + errorText);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xóa học kỳ.');
    } finally {
      setSemesterToDelete(null);
    }
  };

  // Helper: get semesters for a school year
  const getSemestersOfYear = (schoolyearid) => {
    return semesters.filter(s => s.schoolyearid === schoolyearid);
  };

  // Helper: get min startdate, max enddate from semesters
  const getStartEndDate = (schoolyearid) => {
    const sems = getSemestersOfYear(schoolyearid);
    if (sems.length === 0) return { start: '-', end: '-' };
    const start = sems.reduce((min, s) => (!min || s.startdate < min ? s.startdate : min), null);
    const end = sems.reduce((max, s) => (!max || s.enddate > max ? s.enddate : max), null);
    return { start: start ? start.substring(0, 10) : '-', end: end ? end.substring(0, 10) : '-' };
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Năm học</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày bắt đầu</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày kết thúc</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học kỳ</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schoolYears.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-gray-500">Không có năm học nào</td>
                  </tr>
                ) : (
                  schoolYears.map((sy, idx) => {
                    const { start, end } = getStartEndDate(sy.schoolyearid);
                    const sems = getSemestersOfYear(sy.schoolyearid);
                    return (
                      <tr key={sy.schoolyearid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{sy.year}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{start}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{end}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {sems.length === 0 ? (
                            <span className="text-gray-400">Chưa có</span>
                          ) : (
                            <ul className="list-disc ml-4">
                              {sems.map(s => (
                                <li key={s.semesterid}>{s.semestername} ({s.startdate ? s.startdate.substring(0, 10) : '-'} - {s.enddate ? s.enddate.substring(0, 10) : '-'})</li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <button className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 mr-2" onClick={() => handleOpenModal(sy)}>Sửa</button>
                          <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 mr-2" onClick={() => handleDelete(sy.schoolyearid)}>Xóa</button>
                          <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={() => openSemesterModal(sy)}>Quản lý học kỳ</button>
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
      {/* Modal thêm/sửa năm học */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">{editingSchoolYear ? 'Sửa năm học' : 'Thêm năm học mới'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Năm học</label>
                <input type="text" name="year" value={form.year} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div className="flex justify-end mt-6">
                <button type="button" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700 mr-2" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal quản lý học kỳ */}
      {showSemesterModal && selectedSchoolYear && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold mb-4">Quản lý học kỳ - {selectedSchoolYear.year}</h3>
            <form onSubmit={handleSemesterSubmit} className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tên học kỳ</label>
                  <input type="text" name="semestername" value={semesterForm.semestername} onChange={handleSemesterChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày bắt đầu</label>
                  <input type="date" name="startdate" value={semesterForm.startdate} onChange={handleSemesterChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày kết thúc</label>
                  <input type="date" name="enddate" value={semesterForm.enddate} onChange={handleSemesterChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                {editingSemester && (
                  <button type="button" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700 mr-2" onClick={() => { setEditingSemester(null); setSemesterForm({ semestername: '', startdate: '', enddate: '' }); }}>Hủy</button>
                )}
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{editingSemester ? 'Cập nhật' : 'Thêm'}</button>
              </div>
            </form>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên học kỳ</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày bắt đầu</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày kết thúc</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSemestersOfYear(selectedSchoolYear.schoolyearid).length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-4 text-center text-gray-500">Không có học kỳ nào</td>
                    </tr>
                  ) : (
                    getSemestersOfYear(selectedSchoolYear.schoolyearid).map((s, idx) => (
                      <tr key={s.semesterid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{s.semestername}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{s.startdate ? s.startdate.substring(0, 10) : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{s.enddate ? s.enddate.substring(0, 10) : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <button className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 mr-2" onClick={() => handleEditSemester(s)}>Sửa</button>
                          <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700" onClick={() => handleDeleteSemester(s.semesterid)}>Xóa</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-6">
              <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700" onClick={() => { setShowSemesterModal(false); setEditingSemester(null); setSemesterForm({ semestername: '', startdate: '', enddate: '' }); }}>Đóng</button>
            </div>
            {/* Modal xác nhận xóa học kỳ */}
            {semesterToDelete && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4">Xác nhận xóa học kỳ</h3>
                  <p>Bạn có chắc chắn muốn xóa học kỳ này không?</p>
                  <div className="flex justify-end mt-6 gap-2">
                    <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700" onClick={() => setSemesterToDelete(null)}>Hủy</button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" onClick={confirmDeleteSemester}>Xóa</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <ToastContainer />
      {/* Modal xác nhận xóa năm học */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Xác nhận xóa năm học</h3>
            <p>Bạn có chắc chắn muốn xóa năm học này không?</p>
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

export default SchoolYearManagement;