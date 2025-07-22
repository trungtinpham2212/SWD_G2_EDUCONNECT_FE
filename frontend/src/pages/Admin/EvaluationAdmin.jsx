import React, { useEffect, useState, useMemo } from 'react';
import API_URL from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getTokenFromStorage, getAuthHeaders } from '../../utils/auth';

const ITEMS_PER_PAGE = 15;

// Helper: lấy ngày đầu tuần (thứ 2) và cuối tuần (chủ nhật) từ 1 ngày bất kỳ
function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  // Thứ 2 là 1, chủ nhật là 0
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [monday, sunday];
}

// Helper: format yyyy-mm-dd
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Helper: sinh danh sách tuần cho 1 năm học
function generateWeeksForSchoolYear(schoolYear) {
  if (!schoolYear?.year) return [];
  const [startYear, endYear] = schoolYear.year.split('-').map(Number);
  const startDate = new Date(`${startYear}-09-02`); // 2/9
  const endDate = new Date(`${endYear}-05-31`); // cuối tháng 5
  const weeks = [];
  let current = new Date(startDate);
  let weekNumber = 1;
  while (current <= endDate) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Tuần mặc định 2/12-8/12 cho năm 2024-2025
    if (schoolYear.year === '2024-2025' && weekNumber === 14) {
      weekStart.setFullYear(2024, 11, 2); // 2/12/2024
      weekEnd.setFullYear(2024, 11, 8);   // 8/12/2024
    }
    
    const label = `Tuần ${weekNumber} (${weekStart.toLocaleDateString('vi-VN')} - ${weekEnd.toLocaleDateString('vi-VN')})`;
    weeks.push({
      label,
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0],
      weekNumber
    });
    current.setDate(current.getDate() + 7);
    weekNumber++;
  }
  return weeks;
}

const EvaluationAdmin = () => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [modalStudents, setModalStudents] = useState([]);
  const [currentEvaluation, setCurrentEvaluation] = useState(null);

  // Filter states
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('all');

  // State năm học và tuần đang chọn
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  // Fetch school years on mount
  useEffect(() => {
    const fetchSchoolYears = async () => {
      try {
        const res = await fetch(`${API_URL}/api/school-years`, { headers: getAuthHeaders() });
        const data = await res.json();
        setSchoolYears(data);
        // Mặc định chọn năm học 2024-2025
        const defaultYear = data.find(sy => sy.year === '2024-2025') || data[0];
        setSelectedSchoolYear(defaultYear?.schoolyearid || null);
      } catch (err) {
        setSchoolYears([]);
      }
    };
    fetchSchoolYears();
  }, []);

  // Khi chọn năm học, sinh lại danh sách tuần
  useEffect(() => {
    if (!selectedSchoolYear || !schoolYears.length) return;
    const sy = schoolYears.find(sy => sy.schoolyearid === selectedSchoolYear);
    const genWeeks = generateWeeksForSchoolYear(sy);
    setWeeks(genWeeks);
    // Mặc định chọn tuần 2/12-8/12 nếu có, không thì tuần đầu tiên
    const defaultWeek = genWeeks.find(w => w.start === '2024-12-02') || genWeeks[0];
    setSelectedWeek(defaultWeek || null);
  }, [selectedSchoolYear, schoolYears]);

  // Fetch evaluations data
  useEffect(() => {
    const fetchData = async () => {
      // Chỉ fetch khi đã có selectedWeek
      if (!selectedWeek) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // API lấy evaluations theo thời gian
        let apiUrl = `${API_URL}/api/evaluations?page=1&pageSize=1000`;
        if (selectedWeek) {
          apiUrl += `&StartDate=${selectedWeek.start}&EndDate=${selectedWeek.end}`;
        }
        
        const res = await fetch(apiUrl, { headers: getAuthHeaders() });
        if (!res.ok) {
          throw new Error('API call failed');
        }
        
              const data = await res.json();
        const all = Array.isArray(data.items) ? data.items : [];
        
        // Set evaluations - all filtering done on frontend
        setEvaluations(all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        console.log('📊 Evaluations loaded:', all.length);
        
        if (all.length === 0) {
          setError('nodata');
        } else {
          setError(null);
        }
        
      } catch (err) {
        console.error('🚨 fetchData error:', err);
        setEvaluations([]);
        setError('Không thể tải dữ liệu đánh giá. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedWeek]);

  // Dropdown lớp: lấy từ evaluations data
  const allClassOptions = useMemo(() => {
    const uniqueClasses = new Set();
    evaluations.forEach(ev => {
      if (ev.className) {
        uniqueClasses.add(ev.className);
      }
    });
    return Array.from(uniqueClasses).map(className => ({ id: className, name: className }));
  }, [evaluations]);

  // Dropdown giáo viên: lấy từ evaluations data
  const allTeacherOptions = useMemo(() => {
    const uniqueTeachers = new Set();
    evaluations.forEach(ev => {
      if (ev.teacherName && ev.teacherid) {
        uniqueTeachers.add(JSON.stringify({ id: ev.teacherid, name: ev.teacherName }));
      }
    });
    return Array.from(uniqueTeachers).map(str => JSON.parse(str));
  }, [evaluations]);

  // Lọc và sắp xếp evaluations với sorting thông minh
  const filteredAndSortedEvaluations = useMemo(() => {
    let filtered = [...evaluations];

    // Lọc theo lớp
    if (selectedClass !== 'all') {
      filtered = filtered.filter(ev => ev.className === selectedClass);
    }

    // Lọc theo giáo viên
        if (selectedTeacher !== 'all') {
      filtered = filtered.filter(ev => Number(ev.teacherid) === Number(selectedTeacher));
    }

    // Lọc theo loại đánh giá
    if (selectedActivity === 'positive') {
      filtered = filtered.filter(ev => !ev.activity?.isNegative);
    } else if (selectedActivity === 'negative') {
      filtered = filtered.filter(ev => ev.activity?.isNegative);
    }

    // Sắp xếp thông minh theo: lớp học > giáo viên > loại đánh giá > thời gian
    return filtered.sort((a, b) => {
      // 1. Sort theo lớp học (className)
      const classCompare = (a.className || '').localeCompare(b.className || '');
      if (classCompare !== 0) return classCompare;
      
      // 2. Sort theo giáo viên (teacherName)
      const teacherCompare = (a.teacherName || '').localeCompare(b.teacherName || '');
      if (teacherCompare !== 0) return teacherCompare;
      
      // 3. Sort theo loại đánh giá (tích cực trước, tiêu cực sau)
      const negativeA = a.activity?.isNegative ? 1 : 0;
      const negativeB = b.activity?.isNegative ? 1 : 0;
      const negativeCompare = negativeA - negativeB;
      if (negativeCompare !== 0) return negativeCompare;
      
      // 4. Sort theo thời gian (mới nhất trước)
      if (sortAsc) {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
  }, [evaluations, selectedClass, selectedTeacher, selectedActivity, sortAsc]);

  // Pagination cho filtered và sorted data
  const totalFiltered = filteredAndSortedEvaluations.length;
  const totalFilteredPages = Math.max(1, Math.ceil(totalFiltered / ITEMS_PER_PAGE));
  const paginatedEvaluations = filteredAndSortedEvaluations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  // Thêm hàm handlePageChange
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalFilteredPages) {
      setCurrentPage(page);
    }
  };

  // Khi đổi filter loại đánh giá, reset về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedActivity, selectedClass, selectedTeacher]);

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
    if (!firstStudent?.classId) return `(${evaluation.students.length})`;

    // Lấy danh sách học sinh trong lớp đó
    const classStudents = evaluations
      .filter(e => e.students?.length > 0 && e.students[0].classId === firstStudent.classId)
      .flatMap(e => e.students);
    
    // Lấy số lượng học sinh duy nhất trong lớp
    const uniqueStudents = new Set(classStudents.map(s => s.studentId));
    const classSize = uniqueStudents.size;
    
    // Nếu số học sinh trong đánh giá bằng sĩ số lớp
    if (evaluation.students.length === classSize) {
      return 'cả lớp';
    }
    
    return `${evaluation.students.length} học sinh`;
  };

  const handleSortDate = () => {
    setSortAsc(!sortAsc);
    setCurrentPage(1); // Reset về trang 1 khi đổi sort
  };

  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Quản lý đánh giá</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Chọn năm học và tuần */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
          <label className="block text-sm font-medium text-gray-700">Chọn năm học:</label>
          <select
            value={selectedSchoolYear || ''}
            onChange={e => setSelectedSchoolYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {schoolYears.map(sy => (
              <option key={sy.schoolyearid} value={sy.schoolyearid}>{sy.year}</option>
            ))}
          </select>
          <label className="block text-sm font-medium text-gray-700">Chọn tuần:</label>
          <select
            value={selectedWeek?.start || ''}
            onChange={e => {
              const week = weeks.find(w => w.start === e.target.value);
              setSelectedWeek(week || null);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!weeks.length}
          >
            {weeks.map(week => (
              <option key={week.start} value={week.start}>{week.label}</option>
            ))}
          </select>
        </div>

        {/* Filter options */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lớp:</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả các lớp</option>
              {allClassOptions.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Giáo viên đánh giá:</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả giáo viên</option>
              {allTeacherOptions.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại đánh giá:</label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="positive">Tích cực</option>
              <option value="negative">Tiêu cực</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách đánh giá...</p>
          </div>
        ) : (error && error !== 'nodata') ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
        ) : paginatedEvaluations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Không có đánh giá trong khoảng thời gian này.</div>
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
                      Thời gian tạo
                      <span className="ml-1">{sortAsc ? '▲' : '▼'}</span>
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lớp</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giáo viên đánh giá</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung đánh giá</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giờ tạo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học sinh</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedEvaluations.map((ev, idx) => {
                    return (
                      <tr key={ev.evaluationId}>
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{ev.periodNo || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{ev.createdAt ? new Date(ev.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{ev.className || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{ev.teacherName || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs whitespace-pre-line break-words">{ev.content}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ev.activity?.isNegative 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {ev.activity?.isNegative ? 'Tiêu cực' : 'Tích cực'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{getDateTime(ev.createdAt)}</td>
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
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                Hiển thị {paginatedEvaluations.length} / {totalFiltered} đánh giá
                {(selectedClass !== 'all' || selectedTeacher !== 'all' || selectedActivity !== 'all') && 
                  ` (đã lọc từ ${evaluations.length} tổng cộng)`
                }
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>
                {Array.from({ length: totalFilteredPages }, (_, i) => (
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
                  disabled={currentPage === totalFilteredPages}
                >
                  &gt;
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Student Modal */}
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
                      <tr key={student.studentId}>
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : '-'}
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
