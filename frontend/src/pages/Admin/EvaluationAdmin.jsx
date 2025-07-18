import React, { useEffect, useState, useMemo } from 'react';
import API_URL from '../../config/api';
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

// Helper lấy token từ localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const EvaluationAdmin = () => {
  const [evaluations, setEvaluations] = useState([]);
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [modalStudents, setModalStudents] = useState([]);
  const [currentEvaluation, setCurrentEvaluation] = useState(null);

  // Thêm state cho filter
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('all');

  // State năm học và tuần đang chọn
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  // Cache danh sách giáo viên có đánh giá
  const teachersWithEvaluations = useMemo(() => {
    const teacherIds = new Set();
    evaluations.forEach(ev => {
      const section = sections.find(s => s.periodid === ev.periodid);
      if (section) {
        teacherIds.add(section.teacherid);
      }
    });
    return Array.from(teacherIds).map(id => {
      const teacher = teachers.find(t => t.teacherid === id);
      if (!teacher) return null;
      const user = userAccounts.find(u => u.userid === teacher.userid);
      return {
        id: teacher.teacherid,
        name: user ? user.fullname : `Giáo viên ${teacher.teacherid}`
      };
    }).filter(Boolean);
  }, [evaluations, sections, teachers, userAccounts]);

  // Cache danh sách lớp có đánh giá
  const classesWithEvaluations = useMemo(() => {
    const classIds = new Set();
    evaluations.forEach(ev => {
      const section = sections.find(s => s.periodid === ev.periodid);
      if (section) {
        classIds.add(section.classid);
      }
    });
    return Array.from(classIds).map(id => {
      const cls = classes.find(c => c.classid === id);
      return {
        id: cls?.classid,
        name: cls ? cls.classname : `Lớp ${id}`
      };
    });
  }, [evaluations, sections, classes]);

  // Dropdown lớp: lấy từ state classes, không phụ thuộc evaluations
  const allClassOptions = useMemo(() => {
    return Array.isArray(classes)
      ? classes.map(cls => ({ id: cls.classid, name: cls.classname }))
      : [];
  }, [classes]);

  // Dropdown giáo viên: lấy từ teachers + userAccounts (fullname), không phụ thuộc evaluations
  const allTeacherOptions = useMemo(() => {
    return Array.isArray(teachers)
      ? teachers.map(t => {
          const user = Array.isArray(userAccounts) ? userAccounts.find(u => u.userid === t.userid) : null;
          return { id: t.teacherid, name: user ? user.fullname : `Giáo viên ${t.teacherid}` };
        })
      : [];
  }, [teachers, userAccounts]);

  // Fetch school years on mount
  useEffect(() => {
    const fetchSchoolYears = async () => {
      try {
        const res = await fetch(`${API_URL}/api/school-years`, { headers: getAuthHeaders() });
        const data = await res.json();
        setSchoolYears(data);
        // Mặc định chọn năm học chứa ngày 2/12/2024
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

  // Fetch evaluations theo tuần và trang
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [totalPages, setTotalPages] = useState(1);
  const [allEvaluations, setAllEvaluations] = useState([]);
  const [isFetchingAll, setIsFetchingAll] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Trường hợp có lọc loại đánh giá (selectedActivity !== 'all') hoặc lọc đồng thời lớp+giáo viên
        if (selectedActivity !== 'all' || (selectedClass !== 'all' && selectedTeacher !== 'all')) {
          setIsFetchingAll(true);
          let all = [];
          let totalPages = 1;
          // Ưu tiên lấy theo lớp nếu có
          if (selectedClass !== 'all') {
            const firstRes = await fetch(`${API_URL}/api/evaluations/by-class-and-date-range/${selectedClass}?startDate=${selectedWeek.start}&endDate=${selectedWeek.end}&page=1&pageSize=${pageSize}`, { headers: getAuthHeaders() });
            const firstData = await firstRes.json();
            totalPages = firstData.totalPages || 1;
            all = Array.isArray(firstData.items) ? firstData.items : [];
            const fetches = [];
            for (let i = 2; i <= totalPages; i++) {
              fetches.push(fetch(`${API_URL}/api/evaluations/by-class-and-date-range/${selectedClass}?startDate=${selectedWeek.start}&endDate=${selectedWeek.end}&page=${i}&pageSize=${pageSize}`, { headers: getAuthHeaders() }));
            }
            const results = await Promise.all(fetches);
            for (const res of results) {
              const data = await res.json();
              if (Array.isArray(data.items)) all = all.concat(data.items);
            }
          } else if (selectedTeacher !== 'all') {
            const firstRes = await fetch(`${API_URL}/api/evaluations/by-teacher/${selectedTeacher}?page=1&pageSize=${pageSize}`, { headers: getAuthHeaders() });
            const firstData = await firstRes.json();
            totalPages = firstData.totalPages || 1;
            all = Array.isArray(firstData.items) ? firstData.items : [];
            const fetches = [];
            for (let i = 2; i <= totalPages; i++) {
              fetches.push(fetch(`${API_URL}/api/evaluations/by-teacher/${selectedTeacher}?page=${i}&pageSize=${pageSize}`, { headers: getAuthHeaders() }));
            }
            const results = await Promise.all(fetches);
            for (const res of results) {
              const data = await res.json();
              if (Array.isArray(data.items)) all = all.concat(data.items);
            }
          } else {
            // Không chọn lớp/giáo viên, lấy toàn bộ evaluations tuần
            const firstRes = await fetch(`${API_URL}/api/evaluations/by-date-range?startDate=${selectedWeek.start}&endDate=${selectedWeek.end}&page=1&pageSize=${pageSize}`, { headers: getAuthHeaders() });
            const firstData = await firstRes.json();
            totalPages = firstData.totalPages || 1;
            all = Array.isArray(firstData.items) ? firstData.items : [];
            const fetches = [];
            for (let i = 2; i <= totalPages; i++) {
              fetches.push(fetch(`${API_URL}/api/evaluations/by-date-range?startDate=${selectedWeek.start}&endDate=${selectedWeek.end}&page=${i}&pageSize=${pageSize}`, { headers: getAuthHeaders() }));
            }
            const results = await Promise.all(fetches);
            for (const res of results) {
              const data = await res.json();
              if (Array.isArray(data.items)) all = all.concat(data.items);
            }
          }
          setAllEvaluations(all);
          setIsFetchingAll(false);
        } else if (selectedClass !== 'all') {
          // Chỉ lọc lớp (không loại, không giáo viên), phân trang backend
          let evalRes = await fetch(`${API_URL}/api/evaluations/by-class-and-date-range/${selectedClass}?startDate=${selectedWeek.start}&endDate=${selectedWeek.end}&page=${currentPage}&pageSize=${pageSize}`, { headers: getAuthHeaders() });
        let evalDataRaw = [];
          let totalCountRaw = 0;
          let totalPagesRaw = 1;
          let pageSizeRaw = pageSize;
        let noData = false;
        if (evalRes.ok) {
          let json;
          try {
            json = await evalRes.json();
          } catch {
            const text = await evalRes.text();
            if (typeof text === 'string' && text.toLowerCase().includes('no evaluations found')) {
              evalDataRaw = [];
              noData = true;
            } else {
              evalDataRaw = [];
            }
            json = null;
          }
          if (json) {
            if (Array.isArray(json.items)) {
              evalDataRaw = json.items;
                totalCountRaw = json.totalCount || 0;
                totalPagesRaw = json.totalPages || 1;
                pageSizeRaw = json.pageSize || pageSize;
            } else if (typeof json === 'object' && json.message && json.message.toLowerCase().includes('no evaluations found')) {
              evalDataRaw = [];
              noData = true;
            } else {
              evalDataRaw = [];
            }
          }
        } else {
            const text = await evalRes.text();
            if (typeof text === 'string' && text.toLowerCase().includes('no evaluations found')) {
              evalDataRaw = [];
              noData = true;
            } else {
              throw new Error('Một hoặc nhiều API call thất bại');
            }
          }
          // Fetch các dữ liệu khác
          const [sectionRes, classRes, teacherRes, userRes, studentRes, activityRes] = await Promise.all([
            fetch(`${API_URL}/api/periods?page=1&pageSize=100`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/classes?page=1&pageSize=100`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/teachers?page=1&pageSize=100`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/user-accounts`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/students?page=1&pageSize=200`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/activities`, { headers: getAuthHeaders() })
          ]);
          if (!sectionRes.ok || !classRes.ok || !teacherRes.ok || !userRes.ok || !studentRes.ok || !activityRes.ok) {
            throw new Error('Một hoặc nhiều API call thất bại');
          }
          const [sectionsRaw, classesRaw, teachersRaw, users, studentsRaw, activitiesRaw] = await Promise.all([
            sectionRes.json(),
            classRes.json(),
            teacherRes.json(),
            userRes.json(),
            studentRes.json(),
            activityRes.json()
          ]);
          setEvaluations(Array.isArray(evalDataRaw) ? evalDataRaw : []);
          setSections(Array.isArray(sectionsRaw.items) ? sectionsRaw.items : []);
          setClasses(Array.isArray(classesRaw.items) ? classesRaw.items : []);
          setTeachers(Array.isArray(teachersRaw.items) ? teachersRaw.items : []);
          setUserAccounts(Array.isArray(users) ? users : []);
          setStudents(Array.isArray(studentsRaw.items) ? studentsRaw.items : []);
          setActivities(Array.isArray(activitiesRaw) ? activitiesRaw : (Array.isArray(activitiesRaw.items) ? activitiesRaw.items : []));
          setTotalCount(totalCountRaw);
          setTotalPages(totalPagesRaw);
          setPageSize(pageSizeRaw);
          if (noData) setError('nodata');
          else setError(null);
          setAllEvaluations([]); // reset allEvaluations khi không filter
        } else if (selectedTeacher !== 'all') {
          // Chỉ lọc giáo viên (không loại, không lớp), phân trang backend
          let evalRes = await fetch(`${API_URL}/api/evaluations/by-teacher/${selectedTeacher}?page=${currentPage}&pageSize=${pageSize}`, { headers: getAuthHeaders() });
          let evalDataRaw = [];
          let totalCountRaw = 0;
          let totalPagesRaw = 1;
          let pageSizeRaw = pageSize;
          let noData = false;
          if (evalRes.ok) {
            let json;
            try {
              json = await evalRes.json();
            } catch {
              const text = await evalRes.text();
              if (typeof text === 'string' && text.toLowerCase().includes('no evaluations found')) {
                evalDataRaw = [];
                noData = true;
              } else {
                evalDataRaw = [];
              }
              json = null;
            }
            if (json) {
              if (Array.isArray(json.items)) {
                evalDataRaw = json.items;
                totalCountRaw = json.totalCount || 0;
                totalPagesRaw = json.totalPages || 1;
                pageSizeRaw = json.pageSize || pageSize;
              } else if (typeof json === 'object' && json.message && json.message.toLowerCase().includes('no evaluations found')) {
                evalDataRaw = [];
                noData = true;
              } else {
                evalDataRaw = [];
              }
            }
          } else {
            const text = await evalRes.text();
            if (typeof text === 'string' && text.toLowerCase().includes('no evaluations found')) {
              evalDataRaw = [];
              noData = true;
            } else {
              throw new Error('Một hoặc nhiều API call thất bại');
            }
          }
          // Fetch các dữ liệu khác
          const [sectionRes, classRes, teacherRes, userRes, studentRes, activityRes] = await Promise.all([
            fetch(`${API_URL}/api/periods?page=1&pageSize=100`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/classes?page=1&pageSize=100`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/teachers?page=1&pageSize=100`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/user-accounts`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/students?page=1&pageSize=200`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/activities`, { headers: getAuthHeaders() })
          ]);
          if (!sectionRes.ok || !classRes.ok || !teacherRes.ok || !userRes.ok || !studentRes.ok || !activityRes.ok) {
            throw new Error('Một hoặc nhiều API call thất bại');
          }
          const [sectionsRaw, classesRaw, teachersRaw, users, studentsRaw, activitiesRaw] = await Promise.all([
            sectionRes.json(),
            classRes.json(),
            teacherRes.json(),
            userRes.json(),
            studentRes.json(),
            activityRes.json()
          ]);
          setEvaluations(Array.isArray(evalDataRaw) ? evalDataRaw : []);
          setSections(Array.isArray(sectionsRaw.items) ? sectionsRaw.items : []);
          setClasses(Array.isArray(classesRaw.items) ? classesRaw.items : []);
          setTeachers(Array.isArray(teachersRaw.items) ? teachersRaw.items : []);
          setUserAccounts(Array.isArray(users) ? users : []);
          setStudents(Array.isArray(studentsRaw.items) ? studentsRaw.items : []);
          setActivities(Array.isArray(activitiesRaw) ? activitiesRaw : (Array.isArray(activitiesRaw.items) ? activitiesRaw.items : []));
          setTotalCount(totalCountRaw);
          setTotalPages(totalPagesRaw);
          setPageSize(pageSizeRaw);
          if (noData) setError('nodata');
          else setError(null);
          setAllEvaluations([]); // reset allEvaluations khi không filter
        } else {
          // Không lọc gì, phân trang backend
          let evalRes = await fetch(`${API_URL}/api/evaluations/by-date-range?startDate=${selectedWeek.start}&endDate=${selectedWeek.end}&page=${currentPage}&pageSize=${pageSize}`, { headers: getAuthHeaders() });
          let evalDataRaw = [];
          let totalCountRaw = 0;
          let totalPagesRaw = 1;
          let pageSizeRaw = pageSize;
          let noData = false;
          if (evalRes.ok) {
            let json;
            try {
              json = await evalRes.json();
            } catch {
              const text = await evalRes.text();
              if (typeof text === 'string' && text.toLowerCase().includes('no evaluations found')) {
                evalDataRaw = [];
                noData = true;
              } else {
                evalDataRaw = [];
              }
              json = null;
            }
            if (json) {
              if (Array.isArray(json.items)) {
                evalDataRaw = json.items;
                totalCountRaw = json.totalCount || 0;
                totalPagesRaw = json.totalPages || 1;
                pageSizeRaw = json.pageSize || pageSize;
              } else if (typeof json === 'object' && json.message && json.message.toLowerCase().includes('no evaluations found')) {
                evalDataRaw = [];
                noData = true;
              } else {
                evalDataRaw = [];
              }
            }
          } else {
          const text = await evalRes.text();
          if (typeof text === 'string' && text.toLowerCase().includes('no evaluations found')) {
            evalDataRaw = [];
            noData = true;
          } else {
            throw new Error('Một hoặc nhiều API call thất bại');
          }
        }
          // Fetch các dữ liệu khác
        const [sectionRes, classRes, teacherRes, userRes, studentRes, activityRes] = await Promise.all([
            fetch(`${API_URL}/api/periods?page=1&pageSize=100`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/classes?page=1&pageSize=100`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/teachers?page=1&pageSize=100`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/api/user-accounts`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/students?page=1&pageSize=200`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/api/activities`, { headers: getAuthHeaders() })
        ]);
        if (!sectionRes.ok || !classRes.ok || !teacherRes.ok || !userRes.ok || !studentRes.ok || !activityRes.ok) {
          throw new Error('Một hoặc nhiều API call thất bại');
        }
        const [sectionsRaw, classesRaw, teachersRaw, users, studentsRaw, activitiesRaw] = await Promise.all([
          sectionRes.json(),
          classRes.json(),
          teacherRes.json(),
          userRes.json(),
          studentRes.json(),
          activityRes.json()
        ]);
        setEvaluations(Array.isArray(evalDataRaw) ? evalDataRaw : []);
        setSections(Array.isArray(sectionsRaw.items) ? sectionsRaw.items : []);
        setClasses(Array.isArray(classesRaw.items) ? classesRaw.items : []);
        setTeachers(Array.isArray(teachersRaw.items) ? teachersRaw.items : []);
        setUserAccounts(Array.isArray(users) ? users : []);
        setStudents(Array.isArray(studentsRaw.items) ? studentsRaw.items : []);
          setActivities(Array.isArray(activitiesRaw) ? activitiesRaw : (Array.isArray(activitiesRaw.items) ? activitiesRaw.items : []));
          setTotalCount(totalCountRaw);
          setTotalPages(totalPagesRaw);
          setPageSize(pageSizeRaw);
        if (noData) setError('nodata');
        else setError(null);
          setAllEvaluations([]); // reset allEvaluations khi không filter
        }
      } catch (err) {
        setEvaluations([]);
        setAllEvaluations([]);
        setError('Không thể tải dữ liệu đánh giá. Vui lòng thử lại sau.');
        setIsFetchingAll(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedWeek, currentPage, pageSize, selectedClass, selectedTeacher, selectedActivity]);

  // Khi filter client, lọc theo giáo viên và/hoặc loại đánh giá
  const filteredEvaluations = (selectedActivity !== 'all' || (selectedClass !== 'all' && selectedTeacher !== 'all'))
    ? allEvaluations.filter(ev => {
        let match = true;
        if (selectedTeacher !== 'all') {
          const section = sections.find(s => s.periodid === ev.periodid);
          match = match && section && Number(section.teacherid) === Number(selectedTeacher);
        }
        if (selectedActivity !== 'all') {
          const activity = activities.find(act => act.activityid === ev.activityid);
          if (!activity) return false;
          match = match && (selectedActivity === 'negative' ? activity.isnegative : !activity.isnegative);
        }
        return match;
      })
    : evaluations;
  const totalFiltered = filteredEvaluations.length;
  const totalFilteredPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginatedEvaluations = (selectedActivity !== 'all' || (selectedClass !== 'all' && selectedTeacher !== 'all'))
    ? filteredEvaluations.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : evaluations;
  // Khi đổi filter loại đánh giá, reset về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedActivity]);

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

    // Lọc theo giáo viên
    if (selectedTeacher !== 'all') {
      filtered = filtered.filter(ev => {
        const section = sections.find(s => s.periodid === ev.periodid);
        return section && Number(section.teacherid) === Number(selectedTeacher);
      });
    }

    // Lọc theo loại đánh giá dựa trên activity.isnegative
    if (selectedActivity === 'positive') {
      filtered = filtered.filter(ev => {
        const activity = activities.find(act => act.activityid === ev.activityid);
        return activity && !activity.isnegative;
      });
    } else if (selectedActivity === 'negative') {
      filtered = filtered.filter(ev => {
        const activity = activities.find(act => act.activityid === ev.activityid);
        return activity && activity.isnegative;
      });
    }

    // Sắp xếp
    return filtered.sort((a, b) => {
      if (sortAsc) {
        const secA = getSectionInfo(a.periodid);
        const secB = getSectionInfo(b.periodid);
        const dateA = secA ? new Date(secA.perioddate) : new Date(0);
        const dateB = secB ? new Date(secB.perioddate) : new Date(0);
        return dateA - dateB;
      } else {
        const dateA = new Date(a.createdat);
        const dateB = new Date(b.createdat);
        return dateB - dateA;
      }
    });
  }, [evaluations, sections, selectedClass, selectedTeacher, selectedActivity, sortAsc]);

  const handleSortDate = () => {
    setSortAsc(!sortAsc);
    setCurrentPage(1); // Reset về trang 1 khi đổi sort
  };

  // Thêm hàm helper để lấy loại đánh giá
  const getEvaluationType = (evaluation) => {
    const activity = activities.find(act => act.activityid === evaluation.activityid);
    return activity?.isnegative ? 'negative' : 'positive';
  };

  // Thêm hàm handlePageChange
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
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
        {/* Thêm phần filter */}
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
          <div className="text-center py-8 text-gray-500">{isFetchingAll ? 'Đang tải toàn bộ đánh giá...' : 'Không có đánh giá trong khoảng thời gian này.'}</div>
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giờ tạo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học sinh</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedEvaluations.map((ev, idx) => {
                    const sec = getSectionInfo(ev.periodid);
                    return (
                      <tr key={ev.evaluationid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{sec ? sec.periodno : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{sec ? new Date(sec.perioddate).toLocaleDateString('vi-VN') : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{sec ? getClassName(sec.classid) : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{getTeacherName(ev.periodid)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs whitespace-pre-line break-words">{ev.content}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            getEvaluationType(ev) === 'negative' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {getEvaluationType(ev) === 'negative' ? 'Tiêu cực' : 'Tích cực'}
                          </span>
                        </td>
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
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                Hiển thị {paginatedEvaluations.length} / {selectedActivity !== 'all' ? totalFiltered : totalCount} đánh giá
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>
                {Array.from({ length: selectedActivity !== 'all' ? totalFilteredPages : totalPages }, (_, i) => (
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
                  disabled={currentPage === (selectedActivity !== 'all' ? totalFilteredPages : totalPages)}
                >
                  &gt;
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Giữ nguyên phần modal */}
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
