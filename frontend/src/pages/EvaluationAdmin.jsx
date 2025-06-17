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
  const [currentEvaluation, setCurrentEvaluation] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Add headers like in Postman
        const headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };

        // Fetch evaluations with detailed logging
        const evalRes = await fetch(`${API_URL}/api/Evaluation`, { headers });
        console.log('Evaluation Response Status:', evalRes.status);
        console.log('Evaluation Response Headers:', Object.fromEntries(evalRes.headers.entries()));
        
        if (!evalRes.ok) {
          throw new Error(`Evaluation fetch failed with status: ${evalRes.status}`);
        }

        const evalText = await evalRes.text(); // Get raw response text
        console.log('Raw Evaluation Response:', evalText);
        
        let evalData;
        try {
          evalData = JSON.parse(evalText);
          console.log('Parsed Evaluation Data:', evalData);
        } catch (e) {
          console.error('JSON Parse Error:', e);
          throw new Error('Failed to parse evaluation data');
        }

        // Fetch other data
        const [sectionRes, classRes, teacherRes, userRes] = await Promise.all([
          fetch(`${API_URL}/api/Period`, { headers }),
          fetch(`${API_URL}/api/Class`, { headers }),
          fetch(`${API_URL}/api/Teacher`, { headers }),
          fetch(`${API_URL}/api/UserAccount/GetAllUserAccounts`, { headers })
        ]);

        const [sections, classes, teachers, users] = await Promise.all([
          sectionRes.json(),
          classRes.json(),
          teacherRes.json(),
          userRes.json()
        ]);

        setSections(sections);
        setClasses(classes);
        setTeachers(teachers);
        setUserAccounts(users);
        setEvaluations(evalData);
        setError(null);
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('Không thể tải dữ liệu đánh giá. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getSectionInfo = (periodid) => sections.find(sec => Number(sec.periodid) === Number(periodid));
  const getClassName = (classid) => {
    const cls = classes.find(c => Number(c.classid) === Number(classid));
    return cls ? cls.classname : `Lớp ${classid}`;
  };
  const getTeacherName = (periodid) => {
    const sec = getSectionInfo(periodid);
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

  const handleShowStudents = (evaluation) => {
    console.log('Full Evaluation Object:', evaluation);
    console.log('Students Array:', evaluation?.students);
    
    if (evaluation?.students?.length > 0) {
      console.log('First Student:', evaluation.students[0]);
      setModalStudents(evaluation.students);
    } else {
      console.log('No students found in evaluation');
      setModalStudents([]);
    }
    setCurrentEvaluation(evaluation);
    setShowStudentModal(true);
  };

  const getStudentPreview = (evaluation) => {
    if (!evaluation?.students?.length) return '(0)';
    
    // Tìm lớp của học sinh đầu tiên
    const firstStudent = evaluation.students[0];
    if (!firstStudent?.classid) return `(${evaluation.students.length})`;

    // Lấy danh sách học sinh trong lớp đó
    const classStudents = evaluations
      .filter(e => e.students?.length > 0 && e.students[0].classid === firstStudent.classid)
      .flatMap(e => e.students);
    
    // Lấy số lượng học sinh duy nhất trong lớp
    const uniqueStudents = new Set(classStudents.map(s => s.studentid));
    const classSize = uniqueStudents.size;
    
    // Nếu số học sinh trong đánh giá bằng sĩ số lớp
    if (evaluation.students.length === classSize) {
      return 'cả lớp';
    }
    
    return `${evaluation.students.length} học sinh`;
  };

  const sortedEvaluations = sortAsc
    ? [...evaluations].sort((a, b) => {
        const secA = getSectionInfo(a.periodid);
        const secB = getSectionInfo(b.periodid);
        const dateA = secA ? new Date(secA.perioddate) : new Date(0);
        const dateB = secB ? new Date(secB.perioddate) : new Date(0);
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
                    const sec = getSectionInfo(ev.periodid);
                    return (
                      <tr key={ev.evaluationid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{sec ? sec.periodno : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{sec ? new Date(sec.perioddate).toLocaleDateString('vi-VN') : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{sec ? getClassName(sec.classid) : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{getTeacherName(ev.periodid)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs whitespace-pre-line break-words">{ev.content}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{getDateTime(ev.createdat)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <button 
                            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            onClick={() => handleShowStudents(ev)}
                          >
                            Xem {getStudentPreview(ev)} 
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
      {showStudentModal && currentEvaluation && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Danh sách {getStudentPreview(currentEvaluation)} trong đánh giá
            </h3>
            <div className="max-h-96 overflow-y-auto">
              {modalStudents.length === 0 ? (
                <p className="text-gray-500">Không có học sinh</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và tên</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày sinh</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {modalStudents.map((student, idx) => (
                      <tr key={student.studentid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {student.dateofbirth ? new Date(student.dateofbirth).toLocaleDateString('vi-VN') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button 
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700" 
                onClick={() => {
                  setShowStudentModal(false);
                  setCurrentEvaluation(null);
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationAdmin;
