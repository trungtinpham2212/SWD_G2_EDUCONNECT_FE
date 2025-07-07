import React, { useEffect, useState, useMemo } from 'react';
import API_URL from '../../config/api';
import { useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedType, setSelectedType] = useState('all'); // 'all', 'positive', 'negative'
  const [selectedDate, setSelectedDate] = useState(''); // Thêm filter ngày

  const [classStudentCounts, setClassStudentCounts] = useState({});
  const [allClasses, setAllClasses] = useState([]); // lưu toàn bộ thông tin lớp

  // Thêm state cho filter và tuần/năm học
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  // Helper lấy token từ localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch tất cả evaluations của giáo viên khi user?.teacherId thay đổi
  useEffect(() => {
    const fetchAllEvaluations = async () => {
      try {
        setLoading(true);
        setError(null);
        let all = [];
        let page = 1;
        let totalPages = 1;
        do {
          const url = `${API_URL}/api/evaluations/by-teacher/${user?.teacherId}?page=${page}&pageSize=${ITEMS_PER_PAGE}`;
          const evalRes = await fetch(url, { headers: getAuthHeaders() });
          if (!evalRes.ok) throw new Error('API call thất bại');
          const evalData = await evalRes.json();
          if (Array.isArray(evalData.items)) all = all.concat(evalData.items);
          totalPages = evalData.totalPages || 1;
          page++;
        } while (page <= totalPages);
        setEvaluations(all);
        setTotalCount(all.length);
        setTotalPages(1); // phân trang client
        setPageSize(ITEMS_PER_PAGE);
        setError(null);
      } catch (err) {
        setError('Không thể tải dữ liệu đánh giá. Vui lòng thử lại sau.');
        setEvaluations([]);
      } finally {
        setLoading(false);
      }
    };
    if (user?.teacherId) fetchAllEvaluations();
  }, [user?.teacherId]);

  // Khi đổi tuần/năm học, lọc evaluations trên client
  const evaluationsInWeek = useMemo(() => {
    if (!selectedWeek) return evaluations;
    const start = new Date(selectedWeek.start);
    const end = new Date(selectedWeek.end);
    return evaluations.filter(ev => {
      const periodDate = ev.period?.perioddate ? new Date(ev.period.perioddate) : null;
      return periodDate && periodDate >= start && periodDate <= end;
    });
  }, [evaluations, selectedWeek]);

  // Dropdown lớp lấy từ evaluationsInWeek
  const classOptions = useMemo(() => {
    const map = new Map();
    evaluationsInWeek.forEach(ev => {
      const cid = ev.period?.classid;
      let cname = ev.period?.class?.classname;
      if (!cname && allClasses.length > 0 && cid) {
        const found = allClasses.find(c => c.classid === cid);
        cname = found ? found.classname : `Lớp ${cid}`;
      }
      if (cid && !map.has(cid)) map.set(cid, cname || `Lớp ${cid}`);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [evaluationsInWeek, allClasses]);

  // Lọc evaluations theo lớp và loại đánh giá trên evaluationsInWeek
  const filteredEvaluations = useMemo(() => {
    let filtered = [...evaluationsInWeek];
    if (selectedClass !== 'all') {
      filtered = filtered.filter(ev => String(ev.period?.classid) === String(selectedClass));
    }
    if (selectedType !== 'all') {
      filtered = filtered.filter(ev => {
        const activity = activities.find(act => act.activityid === ev.activityid);
        if (!activity) return false;
        return selectedType === 'negative' ? activity.isnegative : !activity.isnegative;
      });
    }
    return filtered;
  }, [evaluationsInWeek, selectedClass, selectedType, activities]);

  // Lọc và sắp xếp evaluations
  const filteredAndSortedEvaluations = useMemo(() => {
    let filtered = [...evaluations];

    // Lọc theo lớp
    if (selectedClass !== 'all') {
      filtered = filtered.filter(ev => {
        const section = sections.find(s => s.periodid === ev.periodid);
        return section && Number(section.classid) === Number(selectedClass);
      });
    }

    // Lọc theo loại đánh giá dựa trên activity.isnegative
    if (selectedType !== 'all') {
      filtered = filtered.filter(ev => {
        const activity = activities.find(act => act.activityid === ev.activityid);
        if (!activity) return false;
        return selectedType === 'negative' ? activity.isnegative : !activity.isnegative;
      });
    }

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
  }, [evaluations, sections, selectedClass, selectedType, selectedDate, activities, sortField, sortAsc]);

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
    const activity = activities.find(act => act.activityid === evaluation.activityid);
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
      evaluations.map(ev => ev.period?.classid).filter(Boolean)
    ));

    // Fetch sĩ số từng lớp
    const fetchClassSizes = async () => {
      const counts = {};
      await Promise.all(classIds.map(async (cid) => {
        try {
          const res = await fetch(`${API_URL}/api/students/by-class/${cid}`, { headers: getAuthHeaders() });
          const data = await res.json();
          counts[cid] = Array.isArray(data) ? data.length : 0;
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

  // Khi render bảng, dùng filteredAndSortedEvaluations để slice phân trang
  const totalFiltered = filteredAndSortedEvaluations.length;
  const totalFilteredPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginatedEvaluations = filteredAndSortedEvaluations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Khi đổi filter, reset về trang 1
  useEffect(() => { setCurrentPage(1); }, [selectedClass, selectedType, selectedWeek, selectedSchoolYear]);

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
        {/* Filter lớp và loại đánh giá */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lớp:</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả các lớp</option>
              {classOptions.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại đánh giá:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
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
                    <td className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung đánh giá</td>
                    <td className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</td>
                    <th
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                      onClick={() => handleSort('createdat')}
                    >
                      Giờ tạo
                      {sortField === 'createdat' && <span className="ml-1">{sortAsc ? '▲' : '▼'}</span>}
                    </th>
                    <td className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học sinh</td>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedEvaluations.map((ev, idx) => {
                    const period = ev.period || {};
                    const className = period.class?.classname || `Lớp ${period.classid || '-'}`;
                    const subjectName = period.subject?.subjectname || `Môn ${period.subjectid || '-'}`;
                    const periodNo = period.periodno || '-';
                    const periodDate = period.perioddate ? new Date(period.perioddate).toLocaleDateString('vi-VN') : '-';
                    return (
                      <tr key={ev.evaluationid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{periodNo}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{periodDate}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {(() => {
                            const cid = ev.period?.classid;
                            let clsName = ev.period?.class?.classname;
                            if (!clsName && allClasses.length > 0 && cid) {
                              const found = allClasses.find(c => c.classid === cid);
                              clsName = found ? found.classname : `Lớp ${cid || '-'}`;
                            }
                            return clsName || `Lớp ${cid || '-'}`;
                          })()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs whitespace-pre-line break-words">{ev.content}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEvaluationType(ev) === 'negative' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {getEvaluationType(ev) === 'negative' ? 'Tiêu cực' : 'Tích cực'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{getDateTime(ev.createdat)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {ev.students && ev.students.length > 0 ? (
                            <button className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={() => handleShowStudents(ev)}>
                              {ev.students.length === classStudentCounts[ev.period?.classid]
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
                Hiển thị {totalCount} / {totalCount} đánh giá
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
      <ToastContainer />
    </div>
  );
};

export default EvaluationManagement;