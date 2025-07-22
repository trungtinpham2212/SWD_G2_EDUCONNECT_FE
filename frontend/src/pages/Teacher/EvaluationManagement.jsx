import React, { useEffect, useState, useMemo } from 'react';
import API_URL from '../../config/api';
import { useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getTokenFromStorage, getAuthHeaders, removeToken } from '../../utils/auth';

const ITEMS_PER_PAGE = 10;

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

const EvaluationManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [evaluations, setEvaluations] = useState([]);
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('createdat'); // 'perioddate' hoặc 'createdat'
  const [sortAsc, setSortAsc] = useState(false); // false để mặc định là giảm dần (mới nhất lên đầu)
  const location = useLocation();
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [modalStudents, setModalStudents] = useState([]);
  const [currentEvaluation, setCurrentEvaluation] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);

  // Thêm state cho filter
  const [selectedDate, setSelectedDate] = useState(''); // Thêm filter ngày

  const [allClasses, setAllClasses] = useState([]); // lưu toàn bộ thông tin lớp

  // Thêm state cho filter và tuần/năm học
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  // Thêm state cho subjects
  const [subjects, setSubjects] = useState([]);

  const [periodDates, setPeriodDates] = useState({}); // { [periodId]: perioddate }

  // Thêm lại khai báo state cho sĩ số lớp
  const [classStudentCounts, setClassStudentCounts] = useState({});


  // Fetch evaluations từ API, truyền sortBy, sortOrder, page, pageSize
  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        setLoading(true);
        setError(null);
        let periodIds = [];
        if (selectedWeek) {
          // Lấy danh sách periodId của tuần
          const periodsUrl = `${API_URL}/api/periods?startDate=${selectedWeek.start}&endDate=${selectedWeek.end}`;
          const periodsRes = await fetch(periodsUrl, { headers: getAuthHeaders() });
          const periodsData = await periodsRes.json();
          periodIds = Array.isArray(periodsData.items) ? periodsData.items.map(p => p.periodid) : [];
        }
        let url = `${API_URL}/api/evaluations?teacherId=${user?.teacherId}`;
        url += `&page=${currentPage}&pageSize=${pageSize}`;
        url += `&sortBy=${sortField}`;
        url += `&sortOrder=${sortAsc ? 'asc' : 'desc'}`;
        if (periodIds.length > 0) {
          periodIds.forEach(pid => { url += `&PeriodId=${pid}`; });
        }
        const evalRes = await fetch(url, { headers: getAuthHeaders() });
        if (!evalRes.ok) throw new Error('API call thất bại');
        const evalData = await evalRes.json();
        setEvaluations(Array.isArray(evalData.items) ? evalData.items : []);
        setTotalCount(evalData.totalCount || 0);
        setTotalPages(evalData.totalPages || 1);
        setError(null);
      } catch (err) {
        setError('Không thể tải dữ liệu đánh giá. Vui lòng thử lại sau.');
        setEvaluations([]);
      } finally {
        setLoading(false);
      }
    };
    if (user?.teacherId) fetchEvaluations();
  }, [user?.teacherId, currentPage, pageSize, sortField, sortAsc, selectedWeek]);

  // Lọc và sắp xếp evaluations
  const filteredAndSortedEvaluations = useMemo(() => {
    let filtered = [...evaluations];

    // Lọc theo ngày
    if (selectedDate) {
      filtered = filtered.filter(ev => {
        const section = sections.find(s => s.periodid === ev.periodid);
        if (!section) return false;
        const sectionDate = new Date(section.perioddate).toISOString().split('T')[0];
        return sectionDate === selectedDate;
      });
    }

    // Sắp xếp
    return filtered.sort((a, b) => {
      let dateA, dateB;
      if (sortField === 'perioddate') {
        const secA = getSectionInfo(a.periodid);
        const secB = getSectionInfo(b.periodid);
        dateA = secA ? new Date(secA.perioddate) : new Date(0);
        dateB = secB ? new Date(secB.perioddate) : new Date(0);
      } else {
        // sortField === 'createdat'
        dateA = new Date(a.createdat);
        dateB = new Date(b.createdat);
      }
      return sortAsc ? dateA - dateB : dateB - dateA;
    });
  }, [evaluations, sections, selectedDate, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Mặc định sắp xếp mới nhất trước
    }
    setCurrentPage(1); // Reset về trang 1 khi đổi sort
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Thêm hàm helper để lấy loại đánh giá
  const getEvaluationType = (evaluation) => {
    // Ưu tiên lấy từ evaluation.activity.isNegative
    if (evaluation.activity && typeof evaluation.activity === 'object' && typeof evaluation.activity.isNegative === 'boolean') {
      return evaluation.activity.isNegative ? 'negative' : 'positive';
    }
    // Fallback: tìm trong activities
    const aid = evaluation.activityid || evaluation.activityId;
    const activity = activities.find(act => act.activityid === aid || act.activityId === aid);
    return activity?.isnegative ? 'negative' : 'positive';
  };

  // Fetch all classes khi load trang
  useEffect(() => {
    const fetchAllClasses = async () => {
      try {
        // Lấy pageSize lớn để lấy hết lớp (giả sử tối đa 100 lớp)
        const res = await fetch(`${API_URL}/api/classes?page=1&pageSize=100`, { headers: getAuthHeaders() });
        const data = await res.json();
        setAllClasses(Array.isArray(data.items) ? data.items : []);
      } catch {
        setAllClasses([]);
      }
    };
    fetchAllClasses();
  }, []);

  // Fetch evaluations và lấy classid, fetch sĩ số lớp
  useEffect(() => {
    if (!evaluations.length) return;

    // Lấy unique classid từ evaluations
    const classIds = Array.from(new Set(
      evaluations.map(ev => ev.period?.classid || ev.classid).filter(Boolean)
    ));

    // Fetch sĩ số từng lớp
    const fetchClassSizes = async () => {
      const counts = {};
      await Promise.all(classIds.map(async (cid) => {
        try {
          const res = await fetch(`${API_URL}/api/students?classId=${cid}`, { headers: getAuthHeaders() });
          const data = await res.json();
          const students = Array.isArray(data.items) ? data.items : data;
          counts[cid] = Array.isArray(students) ? students.length : 0;
        } catch {
          counts[cid] = 0;
        }
      }));
      setClassStudentCounts(counts);
    };
    fetchClassSizes();
  }, [evaluations]);

  // Fetch school years on mount
  useEffect(() => {
    const fetchSchoolYears = async () => {
      try {
        const res = await fetch(`${API_URL}/api/school-years`, { headers: getAuthHeaders() });
        const data = await res.json();
        setSchoolYears(data);
        // Mặc định chọn năm học 2024-2025 và tuần chứa ngày 2/12/2024
        const defaultDate = new Date('2024-12-02');
        let foundYear = data.find(sy => {
          const [startYear, endYear] = sy.year.split('-').map(Number);
          const start = new Date(`${startYear}-09-02`);
          const end = new Date(`${endYear}-05-31`);
          return defaultDate >= start && defaultDate <= end;
        });
        if (!foundYear && data.length > 0) foundYear = data[0];
        setSelectedSchoolYear(foundYear?.schoolyearid || null);
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
    // Mặc định chọn tuần chứa 2/12/2024 nếu có, không thì tuần đầu tiên
    const defaultDate = new Date('2024-12-02');
    let foundWeek = genWeeks.find(w => {
      const start = new Date(w.start);
      const end = new Date(w.end);
      return defaultDate >= start && defaultDate <= end;
    });
    if (!foundWeek && genWeeks.length > 0) foundWeek = genWeeks[0];
    setSelectedWeek(foundWeek || null);
  }, [selectedSchoolYear, schoolYears]);

  // Fetch activities (loại đánh giá)
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch(`${API_URL}/api/activities`, { headers: getAuthHeaders() });
        const data = await res.json();
        setActivities(Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []));
      } catch {
        setActivities([]);
      }
    };
    fetchActivities();
  }, []);

  // Fetch subjects khi load trang
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch(`${API_URL}/api/subjects?page=1&pageSize=100`, { headers: getAuthHeaders() });
        const data = await res.json();
        setSubjects(Array.isArray(data.items) ? data.items : []);
      } catch {
        setSubjects([]);
      }
    };
    fetchSubjects();
  }, []);

  // Khi render bảng, dùng evaluations trả về từ API
  const paginatedEvaluations = filteredAndSortedEvaluations;

  // Khi đổi filter, reset về trang 1
  useEffect(() => { setCurrentPage(1); }, [selectedDate, selectedWeek, selectedSchoolYear]);

  // Fetch perioddate nếu thiếu
  useEffect(() => {
    const fetchMissingPeriodDates = async () => {
      const missing = paginatedEvaluations
        .filter(ev => !ev.periodDate && (ev.periodid || ev.periodId) && !periodDates[ev.periodid || ev.periodId])
        .map(ev => ev.periodid || ev.periodId);
      if (missing.length === 0) return;
      const updates = {};
      await Promise.all(missing.map(async (pid) => {
        try {
          const res = await fetch(`${API_URL}/api/periods/${pid}`, { headers: getAuthHeaders() });
          if (res.ok) {
            const data = await res.json();
            if (data.perioddate) updates[pid] = data.perioddate;
          }
        } catch {}
      }));
      if (Object.keys(updates).length > 0) {
        setPeriodDates(prev => ({ ...prev, ...updates }));
      }
    };
    fetchMissingPeriodDates();
  }, [paginatedEvaluations]);

  const getSectionInfo = (periodid) => sections.find(sec => Number(sec.periodid) === Number(periodid));
  const getClassName = (classid) => {
    const cls = classes.find(c => Number(c.classid) === Number(classid));
    return cls ? cls.classname : `Lớp ${classid}`;
  };

  const getDateTime = (datetime) => {
    if (!datetime) return '-';
    const d = new Date(datetime);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour12: false });
  };

  const handleShowStudents = (evaluation) => {
    if (evaluation?.students?.length > 0) {
      setModalStudents(evaluation.students);
    } else {
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

  // Helper lấy tên môn học từ subjectid
  const getSubjectNameById = (subjectid) => {
    const subject = subjects.find(s => String(s.subjectid) === String(subjectid));
    return subject ? subject.subjectname : `Môn ${subjectid || '-'}`;
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
        {/* Không còn filter lớp và loại đánh giá, chỉ filter tuần */}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách đánh giá...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
        ) : paginatedEvaluations.length === 0 ? (
          <div className="text-gray-500">Không có đánh giá nào phù hợp với bộ lọc.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <td className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</td>
                    <td className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiết</td>
                    <th
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                      onClick={() => handleSort('perioddate')}
                    >
                      Ngày
                      {sortField === 'perioddate' && <span className="ml-1">{sortAsc ? '▲' : '▼'}</span>}
                    </th>
                    <td className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lớp</td>
                    <td className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Môn dạy</td>
                    <td className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung đánh giá</td>
                    <td className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</td>
                    <td className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giờ tạo</td>
                    <td className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học sinh</td>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedEvaluations.map((ev, idx) => {
                    // Ưu tiên lấy trực tiếp từ evaluation, fallback sang period nếu không có
                    const periodNo = ev.periodNo || ev.periodno || ev.period?.periodno || '-';
                    let periodDate = '-';
                    const pid = ev.periodid || ev.periodId;
                    if (ev.periodDate) {
                      periodDate = new Date(ev.periodDate).toLocaleDateString('vi-VN');
                    } else if (ev.period?.perioddate) {
                      periodDate = new Date(ev.period.perioddate).toLocaleDateString('vi-VN');
                    } else if (pid && periodDates[pid]) {
                      periodDate = new Date(periodDates[pid]).toLocaleDateString('vi-VN');
                    }
                    const className = ev.className || ev.classname || ev.period?.class?.classname || `Lớp ${ev.period?.classid || ev.classid || '-'}`;
                    const subjectName = ev.subjectName || ev.subjectname || ev.period?.subject?.subjectname || getSubjectNameById(ev.period?.subjectid);
                    const createdAt = ev.createdAt || ev.createdat || '-';
                    return (
                      <tr key={ev.evaluationid || ev.evaluationId}>
                        <td className="px-4 py-2 text-sm text-gray-500">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{periodNo}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{periodDate}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{className}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{subjectName}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs whitespace-pre-line break-words">{ev.content}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEvaluationType(ev) === 'negative' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {getEvaluationType(ev) === 'negative' ? 'Tiêu cực' : 'Tích cực'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{getDateTime(createdAt)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {ev.students && ev.students.length > 0 ? (
                            <button className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={() => handleShowStudents(ev)}>
                              {ev.students.length === classStudentCounts[ev.period?.classid || ev.classid]
                                ? 'Xem cả lớp'
                                : `Xem ${ev.students.length} học sinh`}
                            </button>
                          ) : (
                            <span className="text-gray-400">Không có</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                Hiển thị {evaluations.length} / {totalCount} đánh giá
              </div>
              <div className="flex items-center gap-2">
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
                          {student.dateOfBirth
                            ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN')
                            : (student.dateofbirth ? new Date(student.dateofbirth).toLocaleDateString('vi-VN') : '-')}
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
      <ToastContainer />
    </div>
  );
};

export default EvaluationManagement;