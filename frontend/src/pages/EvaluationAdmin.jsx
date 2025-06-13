import React, { useEffect, useState } from 'react';
import API_URL from '../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ITEMS_PER_PAGE = 15;

const EvaluationAdmin = () => {
  const [evaluations, setEvaluations] = useState([]);
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [modalStudents, setModalStudents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sectionRes, classRes, evalRes, teacherRes, userRes, studentRes] = await Promise.all([
          fetch(`${API_URL}/api/Section`),
          fetch(`${API_URL}/api/Class`),
          fetch(`${API_URL}/api/Evaluation`),
          fetch(`${API_URL}/api/Teacher`),
          fetch(`${API_URL}/api/UserAccount/GetAllUserAccounts`),
          fetch(`${API_URL}/api/Student`)
        ]);
        const sectionData = await sectionRes.json();
        const classData = await classRes.json();
        const evalData = await evalRes.json();
        const teacherData = await teacherRes.json();
        const userData = await userRes.json();
        const studentData = await studentRes.json();
        setSections(sectionData);
        setClasses(classData);
        setEvaluations(evalData);
        setTeachers(teacherData);
        setUserAccounts(userData);
        setStudents(studentData);
        setError(null);
      } catch (err) {
        setError('Không thể tải dữ liệu đánh giá. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getSectionInfo = (sectionid) => sections.find(sec => Number(sec.sectionid) === Number(sectionid));
  const getClassName = (classid) => {
    const cls = classes.find(c => Number(c.classid) === Number(classid));
    return cls ? cls.classname : `Lớp ${classid}`;
  };
  const getTeacherName = (sectionid) => {
    const sec = getSectionInfo(sectionid);
    if (!sec) return '-';
    const teacher = teachers.find(t => Number(t.teacherid) === Number(sec.teacherid));
    if (!teacher) return '-';
    const user = userAccounts.find(u => Number(u.userid) === Number(teacher.userid));
    return user ? user.fullname : '-';
  };

  const getDateTime = (datetime) => {
    if (!datetime) return '-';
    const d = new Date(datetime);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour12: false });
  };

  const getStudentNames = (evaluation) => {
    if (!evaluation.students || !Array.isArray(evaluation.students)) return [];
    return evaluation.students.map(evStu => {
      const stu = students.find(s => s.studentid === evStu.studentid);
      return stu ? stu.name : `HS ${evStu.studentid}`;
    });
  };

  const handleShowStudents = (evaluation) => {
    setModalStudents(getStudentNames(evaluation));
    setShowStudentModal(true);
  };

  const sortedEvaluations = sortAsc
    ? [...evaluations].sort((a, b) => {
        const secA = getSectionInfo(a.sectionid);
        const secB = getSectionInfo(b.sectionid);
        const dateA = secA ? new Date(secA.sectiondate) : new Date(0);
        const dateB = secB ? new Date(secB.sectiondate) : new Date(0);
        return dateA - dateB;
      })
    : [...evaluations].sort((a, b) => {
        const dateA = new Date(a.createdat);
        const dateB = new Date(b.createdat);
        return dateB - dateA;
      });

  const totalPages = Math.ceil(sortedEvaluations.length / ITEMS_PER_PAGE);
  const paginatedEvaluations = sortedEvaluations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSortDate = () => {
    setSortAsc((prev) => !prev);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Quản lý đánh giá</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách đánh giá...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
        ) : evaluations.length === 0 ? (
          <div className="text-gray-500">Không có đánh giá nào.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiết</th>
                    <th
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={handleSortDate}
                    >
                      Ngày
                      <span className="ml-1">{sortAsc ? '▲' : '▼'}</span>
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lớp</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giáo viên đánh giá</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung đánh giá</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giờ tạo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học sinh</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedEvaluations.map((ev, idx) => {
                    const sec = getSectionInfo(ev.sectionid);
                    return (
                      <tr key={ev.evaluationid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{sec ? sec.sectionno : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{sec ? new Date(sec.sectiondate).toLocaleDateString('vi-VN') : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{sec ? getClassName(sec.classid) : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{getTeacherName(ev.sectionid)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs whitespace-pre-line break-words">{ev.content}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{getDateTime(ev.createdat)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <button className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={() => handleShowStudents(ev)}>
                            Xem học sinh
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center items-center mt-6 gap-2">
              <button
                className="px-3 py-1 rounded border bg-gray-100 hover:bg-gray-200"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`px-3 py-1 rounded border ${currentPage === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  onClick={() => handlePageChange(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="px-3 py-1 rounded border bg-gray-100 hover:bg-gray-200"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                &gt;
              </button>
            </div>
          </>
        )}
      </div>
      {/* Modal danh sách học sinh */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Danh sách học sinh trong đánh giá</h3>
            <ul className="list-disc ml-4 mb-4">
              {modalStudents.length === 0 ? (
                <li>Không có học sinh</li>
              ) : (
                modalStudents.map((name, idx) => <li key={idx}>{name}</li>)
              )}
            </ul>
            <div className="flex justify-end">
              <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700" onClick={() => setShowStudentModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationAdmin;
