import React, { useEffect, useState } from 'react';
import API_URL from '../config/api';
import { useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ITEMS_PER_PAGE = 20;

const EvaluationManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [evaluations, setEvaluations] = useState([]);
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(false); // sort theo ngày
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [modalStudents, setModalStudents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Lấy tất cả section mà giáo viên này dạy
        const sectionRes = await fetch(`${API_URL}/api/Period`);
        const sectionData = await sectionRes.json();
        const mySections = sectionData.filter(sec => Number(sec.teacherid) === Number(user?.teacherid));
        setSections(mySections);
        // Lấy tất cả lớp để map tên lớp
        const classRes = await fetch(`${API_URL}/api/Class`);
        const classData = await classRes.json();
        setClasses(classData);
        // Lấy tất cả evaluation
        const evalRes = await fetch(`${API_URL}/api/Evaluation`);
        const evalData = await evalRes.json();
        // Chỉ lấy evaluation thuộc các section mà giáo viên này dạy
        const mySectionIds = new Set(mySections.map(sec => Number(sec.periodid)));
        const filteredEvaluations = evalData.filter(ev => mySectionIds.has(Number(ev.periodid)));
        setEvaluations(filteredEvaluations);
        const studentRes = await fetch(`${API_URL}/api/Student`);
        const studentData = await studentRes.json();
        setStudents(studentData);
        const userRes = await fetch(`${API_URL}/api/UserAccount/GetAllUserAccounts`);
        const userData = await userRes.json();
        setUserAccounts(userData);
        setError(null);
      } catch (err) {
        setError('Không thể tải dữ liệu đánh giá. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    if (user?.teacherid) {
      fetchData();
    }
    // eslint-disable-next-line
  }, [user?.teacherid, location.pathname]);

  // Helper lấy thông tin section và lớp
  const getSectionInfo = (periodid) => sections.find(sec => sec.periodid === periodid);
  const getClassName = (classid) => {
    const cls = classes.find(c => c.classid === classid);
    return cls ? cls.classname : `Lớp ${classid}`;
  };

  // Sort evaluations theo giờ tạo (createdat) mặc định, hoặc theo ngày section nếu bấm sort
  const sortedEvaluations = sortAsc
    ? [...evaluations].sort((a, b) => {
        // sort tăng dần theo ngày perioddate
        const secA = getSectionInfo(a.periodid);
        const secB = getSectionInfo(b.periodid);
        const dateA = secA ? new Date(secA.perioddate) : new Date(0);
        const dateB = secB ? new Date(secB.perioddate) : new Date(0);
        return dateA - dateB;
      })
    : [...evaluations].sort((a, b) => {
        // sort giảm dần theo giờ tạo (createdat)
        const dateA = new Date(a.createdat);
        const dateB = new Date(b.createdat);
        return dateB - dateA;
      });

  // Pagination
  const totalPages = Math.ceil(sortedEvaluations.length / ITEMS_PER_PAGE);
  const paginatedEvaluations = sortedEvaluations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Helper lấy ngày và giờ từ datetime
  const getDateTime = (datetime) => {
    if (!datetime) return '-';
    const d = new Date(datetime);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour12: false });
  };

  // Handler sort
  const handleSortDate = () => {
    setSortAsc((prev) => !prev);
    setCurrentPage(1);
  };

  // Handler chuyển trang
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
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
          <div className="text-gray-500">Không có đánh giá nào cho các tiết bạn dạy.</div>
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung đánh giá</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giờ tạo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học sinh</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedEvaluations.map((ev, idx) => {
                    const sec = getSectionInfo(ev.periodid);
                    return (
                      <tr key={ev.evaluationid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{sec ? sec.periodno : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{sec ? new Date(sec.perioddate).toLocaleDateString('vi-VN') : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{sec ? getClassName(sec.classid) : '-'}</td>
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
            {/* Pagination */}
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

export default EvaluationManagement;