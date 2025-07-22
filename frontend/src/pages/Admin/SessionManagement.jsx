import React, { useEffect, useState, useMemo, useCallback } from 'react';
import API_URL from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getTokenFromStorage, getAuthHeaders } from '../../utils/auth';

const SessionManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedClass, setSelectedClass] = useState('all'); // 'all' hoặc classId
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [form, setForm] = useState({
    subjectid: '',
    teacherid: ''
  });
  const [students, setStudents] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [periodsError, setPeriodsError] = useState(null);
  const [periodEvaluations, setPeriodEvaluations] = useState({});

  // Define time slots for each period
  const timeSlots = [
    { period: 1, start: '7:00', end: '7:45' },
    { period: 2, start: '7:45', end: '8:30' },
    { period: 3, start: '9:00', end: '9:45' },
    { period: 4, start: '9:45', end: '10:30' },
    { period: 5, start: '13:15', end: '14:00' },
    { period: 6, start: '14:00', end: '14:45' },
    { period: 7, start: '15:15', end: '16:00' },
    { period: 8, start: '16:00', end: '16:45' }
  ];

  // Helper: sinh danh sách tuần cho 1 năm học (mặc định từ 2/12/2024 đến 8/12/2024)
  // Note: API evaluations đã được tối ưu với filtering và sorting từ backend để tránh lag
  // - Sử dụng StartDate/EndDate thay vì startDate/endDate
  // - Có thể filter theo ClassId, PeriodId, TeacherId để giảm data load
  // - Backend đã sort nên không cần sort lại ở frontend
  function generateWeeksForSchoolYear(schoolYear) {
    if (!schoolYear?.year) return [];
    const [startYear, endYear] = schoolYear.year.split('-').map(Number);
    
    // Đặc biệt cho năm 2024-2025: bắt đầu từ tuần 2/12 - 8/12
    if (schoolYear.year === '2024-2025') {
      const weeks = [];
      // Tuần mặc định từ 2/12/2024 đến 8/12/2024
      const defaultWeekStart = new Date('2024-12-02');
      const defaultWeekEnd = new Date('2024-12-08');
      weeks.push({
        label: `Tuần 1 (${defaultWeekStart.toLocaleDateString('vi-VN')} - ${defaultWeekEnd.toLocaleDateString('vi-VN')})`,
        start: defaultWeekStart.toISOString().split('T')[0],
        end: defaultWeekEnd.toISOString().split('T')[0],
        weekNumber: 1
      });
      
      // Tạo thêm các tuần khác nếu cần
      let current = new Date(defaultWeekEnd);
      current.setDate(current.getDate() + 1); // Ngày đầu tuần tiếp theo
      let weekNumber = 2;
      const endDate = new Date(`${endYear}-05-31`);
      
      while (current <= endDate) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weeks.push({
          label: `Tuần ${weekNumber} (${weekStart.toLocaleDateString('vi-VN')} - ${weekEnd.toLocaleDateString('vi-VN')})`,
          start: weekStart.toISOString().split('T')[0],
          end: weekEnd.toISOString().split('T')[0],
          weekNumber
        });
        current.setDate(current.getDate() + 7);
        weekNumber++;
      }
      return weeks;
    }
    
    // Logic cũ cho các năm học khác
    let startDate = new Date(`${startYear}-09-02`);
    const dayOfWeek = startDate.getDay();
    if (dayOfWeek !== 1) {
      const diff = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      startDate.setDate(startDate.getDate() - diff);
    }
    const endDate = new Date(`${endYear}-05-31`);
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

  // Cache cho dữ liệu
  const subjectsMap = useMemo(() => {
    if (!Array.isArray(subjects)) return {};
    return subjects.reduce((acc, sub) => {
      acc[sub.subjectid] = sub.subjectname;
      return acc;
    }, {});
  }, [subjects]);

  const teachersMap = useMemo(() => {
    if (!Array.isArray(teachers)) return {};
    return teachers.reduce((acc, t) => {
      const u = userAccounts.find(u => u.userid === t.userid);
      acc[t.teacherid] = u ? u.fullname : `GV ${t.teacherid}`;
      return acc;
    }, {});
  }, [teachers, userAccounts]);

  // Cache cho sections theo tuần
  const sectionsForWeek = useMemo(() => {
    if (!selectedWeek) return [];
    
    const weekStart = new Date(selectedWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    return sections.filter(section => {
      const sectionDate = new Date(section.perioddate);
      return sectionDate >= weekStart && sectionDate <= weekEnd;
    });
  }, [sections, selectedWeek]);

  // Cache cho sections theo cell
  const sectionsByCell = useMemo(() => {
    const cache = {};
    sections.forEach(section => {
      let sectionDateStr;
      if (section.perioddate.includes('T')) {
        sectionDateStr = section.perioddate.split('T')[0];
      } else {
        sectionDateStr = section.perioddate;
      }
      
      // Đảm bảo các giá trị là số
      const classId = Number(section.classid);
      const period = Number(section.periodno || section.period); // Hỗ trợ cả 2 trường hợp
      
      const key = `${classId}-${period}-${sectionDateStr}`;
      cache[key] = section;
    });
    return cache;
  }, [sections]);

  // Helper function to check if a date is in the past
  const isDateInPast = useCallback((date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  }, []);

  // Helper function to get evaluations for a specific section (cải thiện matching)
  const getEvaluationsForSection = useCallback((periodId) => {
    if (!periodId || !evaluations.length) return [];
    
    const matches = evaluations.filter(evaluation => {
      // Thử nhiều cách match periodId khác nhau vì API có thể trả về field names khác nhau
      const evalPeriodId = evaluation.periodId || evaluation.periodid || evaluation.PeriodId;
      return Number(evalPeriodId) === Number(periodId);
    });
    
    return matches;
  }, [evaluations]);

  // Helper function to fetch evaluations for specific period (tối ưu cho performance)
  const fetchEvaluationsForPeriod = useCallback(async (periodId, classId, teacherId = null) => {
    try {
      const token = getTokenFromStorage();
      if (!token) return [];

      // Sử dụng API với PeriodId và ClassId để lấy data chính xác
      let apiUrl = `${API_URL}/api/evaluations?PeriodId=${periodId}&ClassId=${classId}&page=1&pageSize=100`;
      
      // Thêm TeacherId nếu có để filter thêm
      if (teacherId) {
        apiUrl += `&TeacherId=${teacherId}`;
      }
      
      const res = await fetch(apiUrl, {
        headers: getAuthHeaders()
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return [];
      }

      if (!res.ok) return [];
      
      const data = await res.json();
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      console.error('Fetch evaluations for period error:', err);
      return [];
    }
  }, []);

  // Helper function to fetch evaluations by filters (cho các trường hợp đặc biệt)
  const fetchEvaluationsByFilters = useCallback(async (filters = {}) => {
    try {
      const token = getTokenFromStorage();
      if (!token) return [];

      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('pageSize', '500');
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, value);
        }
      });

      const apiUrl = `${API_URL}/api/evaluations?${params.toString()}`;
      
      const res = await fetch(apiUrl, {
        headers: getAuthHeaders()
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return [];
      }

      if (!res.ok) return [];
      
      const data = await res.json();
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      console.error('Fetch evaluations by filters error:', err);
      return [];
    }
  }, []);

  // Helper function to get evaluation type
  const getEvaluationType = useCallback((evaluation) => {
    // API mới có thể đã include activity info trong evaluation response
    if (evaluation.activity && typeof evaluation.activity === 'object') {
      return evaluation.activity.isNegative ? 'negative' : 'positive';
    }
    // Fallback: tìm trong activities array nếu có
    if (Array.isArray(activities) && evaluation.activityid) {
      const activity = activities.find(act => act.activityid === evaluation.activityid);
      return activity?.isnegative ? 'negative' : 'positive';
    }
    // Default: assume positive if no activity info
    return 'positive';
  }, [activities]);

  // Helper function to get student preview
  const getStudentPreview = useCallback((evaluation) => {
    if (!evaluation?.students?.length) return '(0)';
    
    const firstStudent = evaluation.students[0];
    
    // API mới có thể dùng classId thay vì classid
    const studentClassId = firstStudent?.classId || firstStudent?.classid;
    if (!studentClassId) return `(${evaluation.students.length})`;

    const classStudents = evaluations
      .filter(e => e.students?.length > 0)
      .flatMap(e => e.students)
      .filter(s => (s.classId || s.classid) === studentClassId);
    
    const uniqueStudents = new Set(classStudents.map(s => s.studentId || s.studentid));
    const classSize = uniqueStudents.size;
    
    if (evaluation.students.length === classSize) {
      return 'cả lớp';
    }
    
    return `${evaluation.students.length} học sinh`;
  }, [evaluations]);

  // Helper function to get student names
  const getStudentNames = useCallback((evaluation) => {
    if (!evaluation?.students?.length) return 'Không có học sinh';
    
    // Kiểm tra xem có phải đánh giá cả lớp không
    const firstStudent = evaluation.students[0];
    
    // API mới có thể dùng classId thay vì classid
    const studentClassId = firstStudent?.classId || firstStudent?.classid;
    if (!studentClassId) {
      return evaluation.students.map(student => 
        student.name || `Học sinh ${student.studentId || student.studentid}`
      ).join(', ');
    }

    // Lấy danh sách học sinh trong lớp đó
    const classStudents = evaluations
      .filter(e => e.students?.length > 0)
      .flatMap(e => e.students)
      .filter(s => (s.classId || s.classid) === studentClassId);
    
    // Lấy số lượng học sinh duy nhất trong lớp
    const uniqueStudents = new Set(classStudents.map(s => s.studentId || s.studentid));
    const classSize = uniqueStudents.size;
    
    // Nếu số học sinh trong đánh giá bằng sĩ số lớp
    if (evaluation.students.length === classSize) {
      return 'Cả lớp';
    }
    
    // Nếu không phải cả lớp, hiển thị danh sách tên
    return evaluation.students.map(student => 
      student.name || `Học sinh ${student.studentId || student.studentid}`
    ).join(', ');
  }, [evaluations]);

  // Fetch static data (classes, subjects, teachers, userAccounts, activities, students) only once
  useEffect(() => {
    // Kiểm tra token khi component mount
    const token = getTokenFromStorage();
    if (!token) {
      setError('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
      setLoading(false);
      return;
    }

    const fetchStaticData = async () => {
      try {
        setLoading(true);

        // Kiểm tra token trước khi gọi API
        const token = getTokenFromStorage();
        if (!token) {
          setError('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
          toast.error('Vui lòng đăng nhập lại');
          return;
        }

        const [subjectRes, classRes, teacherRes, userRes, activityRes, schoolYearRes, studentRes] = await Promise.all([
          fetch(`${API_URL}/api/subjects?page=1&pageSize=15`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/api/classes?page=1&pageSize=30`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/api/teachers?page=1&pageSize=30`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/api/user-accounts`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/api/activities`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/api/school-years`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/api/students?page=1&pageSize=400`, { headers: getAuthHeaders() })
        ]);

        // Kiểm tra lỗi 401 cho tất cả response
        const responses = [subjectRes, classRes, teacherRes, userRes, activityRes, schoolYearRes, studentRes];
        if (responses.some(res => res.status === 401)) {
          localStorage.removeItem('token');
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          return;
        }

        if (!subjectRes.ok || !classRes.ok || !teacherRes.ok || !userRes.ok || !activityRes.ok || !schoolYearRes.ok || !studentRes.ok) {
          throw new Error(`HTTP error! Status: ${responses.find(r => !r.ok)?.status}`);
        }
        const [subjectData, classData, teacherData, userData, activityData, schoolYearData, studentData] = await Promise.all([
          subjectRes.json(),
          classRes.json(),
          teacherRes.json(),
          userRes.json(),
          activityRes.json(),
          schoolYearRes.json(),
          studentRes.json()
        ]);
        // Sort dữ liệu ở frontend (xử lý null/undefined values)
        const sortedSubjects = Array.isArray(subjectData.items) ? subjectData.items.sort((a, b) => (a.subjectname || '').localeCompare(b.subjectname || '')) : [];
        const sortedClasses = Array.isArray(classData.items) ? classData.items.sort((a, b) => (a.classname || '').localeCompare(b.classname || '')) : [];
        const sortedTeachers = Array.isArray(teacherData.items) ? teacherData.items.sort((a, b) => (a.teacherid || 0) - (b.teacherid || 0)) : [];
        const sortedUserAccounts = Array.isArray(userData) ? userData.sort((a, b) => (a.fullname || '').localeCompare(b.fullname || '')) : userData;
        const sortedActivities = Array.isArray(activityData) ? activityData.sort((a, b) => (a.activityname || '').localeCompare(b.activityname || '')) : [];
        const sortedSchoolYears = Array.isArray(schoolYearData) ? schoolYearData.sort((a, b) => (a.year || '').localeCompare(b.year || '')) : schoolYearData;
        const sortedStudents = Array.isArray(studentData.items) ? studentData.items.sort((a, b) => (a.fullname || '').localeCompare(b.fullname || '')) : [];

        setSubjects(sortedSubjects);
        setClasses(sortedClasses);
        setTeachers(sortedTeachers);
        setUserAccounts(sortedUserAccounts);
        setActivities(sortedActivities);
        setSchoolYears(sortedSchoolYears);
        setStudents(sortedStudents);
        setError(null);
        
        // Debug log
        console.log('📊 Static data loaded:');
        console.log('- Subjects:', sortedSubjects.length);
        console.log('- Classes:', sortedClasses.length);
        console.log('- Teachers:', sortedTeachers.length);
        console.log('- Activities:', Array.isArray(sortedActivities) ? sortedActivities.length : 'NOT ARRAY', sortedActivities);
        console.log('- School Years:', sortedSchoolYears.length);
        // Mặc định chọn năm học 2024-2025
        let foundYear = schoolYearData.find(sy => sy.year === '2024-2025');
        if (!foundYear && schoolYearData.length > 0) foundYear = schoolYearData[0];
        setSelectedSchoolYear(foundYear?.schoolyearid || null);
      } catch (err) {
        console.error('Fetch error:', err);
        if (err.message.includes('401')) {
          localStorage.removeItem('token');
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else {
          setError('Không thể tải dữ liệu. Vui lòng thử lại sau: ' + err.message);
          toast.error('Không thể tải dữ liệu. Vui lòng thử lại sau.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchStaticData();
  }, []);

  // Khi chọn năm học, sinh lại danh sách tuần
  useEffect(() => {
    if (!selectedSchoolYear || !schoolYears.length) return;
    const sy = schoolYears.find(sy => sy.schoolyearid === selectedSchoolYear);
    const genWeeks = generateWeeksForSchoolYear(sy);
    setWeeks(genWeeks);
    // Mặc định chọn tuần từ 2/12/2024 đến 8/12/2024
    let foundWeek = genWeeks.find(w => {
      return w.start === '2024-12-02' && w.end === '2024-12-08';
    });
    if (!foundWeek && genWeeks.length > 0) foundWeek = genWeeks[0];
    setSelectedWeek(foundWeek || null);
  }, [selectedSchoolYear, schoolYears]);

  // Thêm hàm fetchPeriodsForCurrentWeek
  const fetchPeriodsForCurrentWeek = useCallback(async () => {
    if (!selectedWeek || !classes.length) return;
    setPeriodsLoading(true);
    setPeriodsError(null);
    try {
      // Kiểm tra token
      const token = getTokenFromStorage();
      if (!token) {
        setPeriodsError('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        toast.error('Vui lòng đăng nhập lại');
        return;
      }

      // Lấy periods cho tuần hiện tại với API mới (single call thay vì multiple calls)
      let apiUrl = `${API_URL}/api/periods?startDate=${selectedWeek.start}&endDate=${selectedWeek.end}&page=1&pageSize=100`;
      
      // Nếu không phải "all" thì thêm classId filter
      if (selectedClass !== 'all') {
        apiUrl += `&classId=${selectedClass}`;
      }

      const response = await fetch(apiUrl, {
        headers: getAuthHeaders()
      });

      // Kiểm tra lỗi 401
      if (response.status === 401) {
        localStorage.removeItem('token');
        setPeriodsError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const periodsData = Array.isArray(data.items) ? data.items : [];
      
      // Sort periods theo ngày và tiết
      const sortedPeriodsData = periodsData.sort((a, b) => {
        // Sort theo ngày trước
        const dateA = new Date(a.perioddate);
        const dateB = new Date(b.perioddate);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        // Nếu cùng ngày thì sort theo tiết
        return (a.periodno || a.period || 0) - (b.periodno || b.period || 0);
      });
      
      setSections(sortedPeriodsData);
    } catch (err) {
      console.error('Periods fetch error:', err);
      setSections([]);
      if (err.message.includes('401')) {
        localStorage.removeItem('token');
        setPeriodsError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setPeriodsError('Không thể tải dữ liệu tiết học cho tuần này: ' + err.message);
      }
    } finally {
      setPeriodsLoading(false);
    }
  }, [selectedWeek, classes, selectedClass]);

  // Sử dụng fetchPeriodsForCurrentWeek trong useEffect
  useEffect(() => {
    fetchPeriodsForCurrentWeek();
  }, [fetchPeriodsForCurrentWeek]);

  // Fetch evaluations cho các period IDs trong tuần khi sections hoặc selectedClass thay đổi
  useEffect(() => {
    if (!sections.length) return;
    
    const fetchEvaluationsForPeriods = async () => {
      try {
        // Kiểm tra token
        const token = getTokenFromStorage();
        if (!token) {
          setEvaluations([]);
          return;
        }

        // Lấy tất cả period IDs từ sections trong tuần hiện tại
        let periodIds = sections.map(section => section.periodid).filter(id => id);
        
        // Nếu chọn lớp cụ thể thì chỉ lấy period IDs của lớp đó
        if (selectedClass !== 'all') {
          periodIds = sections
            .filter(section => Number(section.classid) === Number(selectedClass))
            .map(section => section.periodid)
            .filter(id => id);
        }
        
        // Nếu không có period IDs thì không cần gọi API
        if (periodIds.length === 0) {
          setEvaluations([]);
          return;
        }

        // Gọi API với PeriodIds để chỉ lấy evaluations cho các tiết học trong tuần
        const params = new URLSearchParams();
        params.append('page', '1');
        params.append('pageSize', '1000');
        
        // Truyền nhiều PeriodId (API mới hỗ trợ multiple period IDs)
        periodIds.forEach(periodId => {
          params.append('PeriodId', periodId);
        });

        const apiUrl = `${API_URL}/api/evaluations?${params.toString()}`;
        console.log('🔍 Fetching evaluations for periods:', periodIds);
        console.log('🔗 API URL:', apiUrl);

        const res = await fetch(apiUrl, {
          headers: getAuthHeaders()
        });

        // Kiểm tra lỗi 401
        if (res.status === 401) {
          localStorage.removeItem('token');
          setEvaluations([]);
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          return;
        }

        if (!res.ok) {
          setEvaluations([]);
          return;
        }
        
        const data = await res.json();
        console.log('📦 Raw API response:', data);
        
        // Try different possible data structures
        let evaluationsData = [];
        if (Array.isArray(data.items)) {
          evaluationsData = data.items;
          console.log('✅ Using data.items structure');
        } else if (Array.isArray(data)) {
          evaluationsData = data;
          console.log('✅ Using direct array structure');
        } else if (data.evaluations && Array.isArray(data.evaluations)) {
          evaluationsData = data.evaluations;
          console.log('✅ Using data.evaluations structure');
        } else {
          console.log('❌ Unknown data structure:', Object.keys(data));
        }
        
        console.log('📊 Evaluations loaded for', periodIds.length, 'periods:', evaluationsData.length);
        if (evaluationsData.length > 0) {
          console.log('📋 Sample evaluation:', evaluationsData[0]);
        }
        
        // Backend đã sort nên không cần sort lại ở frontend
        setEvaluations(evaluationsData);
      } catch (err) {
        console.error('Evaluations fetch error:', err);
        if (err.message.includes('401')) {
          localStorage.removeItem('token');
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        setEvaluations([]);
      }
    };
    
    fetchEvaluationsForPeriods();
  }, [sections, selectedClass]); // Dependency vào sections và selectedClass

  // Helper lấy tên môn học từ subjectid
  const getSubjectNameById = useCallback((subjectid) => {
    if (!subjectid || subjectid === 0) return '-';
    const subject = Array.isArray(subjects) ? subjects.find(s => Number(s.subjectid) === Number(subjectid)) : null;
    return subject && subject.subjectname && subject.subjectname !== 'string' ? subject.subjectname : '-';
  }, [subjects]);

  // Helper lấy fullname giáo viên từ teacherid
  const getTeacherFullnameById = useCallback((teacherid) => {
    const teacher = Array.isArray(teachers) ? teachers.find(t => t.teacherid === teacherid) : null;
    if (!teacher) return '-';
    const user = Array.isArray(userAccounts) ? userAccounts.find(u => u.userid === teacher.userid) : null;
    return user ? user.fullname : '-';
  }, [teachers, userAccounts]);

  // Helper lấy evaluations cho 1 tiết học
  const getEvaluationsForPeriod = useCallback((classid, periodno, date) => {
    if (!evaluations.length) return [];
    
    const dateStr = new Date(date).toISOString().split('T')[0];
    
    // Thử nhiều cách match khác nhau vì structure có thể khác
    const result = evaluations.filter(e => {
      // Match classid - API mới có thể dùng classId hoặc classid
      const classMatch = Number(e.classId) === Number(classid) || 
                         Number(e.classid) === Number(classid) || 
                         Number(e.ClassId) === Number(classid);
      
      // Match periodno - API mới có thể dùng periodNo hoặc periodno
      const periodMatch = Number(e.periodNo) === Number(periodno) || 
                          Number(e.periodno) === Number(periodno) ||
                          Number(e.PeriodNo) === Number(periodno) ||
                          Number(e.period) === Number(periodno);
      
      // Match date - API mới có thể dùng createdAt hoặc các field khác
      let dateMatch = false;
      if (e.createdAt) {
        dateMatch = e.createdAt.split('T')[0] === dateStr;
      } else if (e.createdat) {
        dateMatch = e.createdat.split('T')[0] === dateStr;
      } else if (e.perioddate) {
        dateMatch = e.perioddate.split('T')[0] === dateStr;
      } else if (e.PeriodDate) {
        dateMatch = e.PeriodDate.split('T')[0] === dateStr;
      }
      
      return classMatch && periodMatch && dateMatch;
    });
    
    return result;
  }, [evaluations]);

  const getSubjectName = useCallback((subjectid) => {
    return subjectsMap[subjectid] || '-';
  }, [subjectsMap]);

  const getTeacherName = useCallback((teacherid) => {
    return teachersMap[teacherid] || '-';
  }, [teachersMap]);

  const getDayOfWeek = useCallback((date) => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[new Date(date).getDay()];
  }, []);

  const getSectionForCell = useCallback((classId, periodNo, date) => {
    // So sánh ngày chỉ lấy phần YYYY-MM-DD
    const dateStr = new Date(date).toISOString().split('T')[0];
    return sections.find(
      s =>
        Number(s.classid) === Number(classId) &&
        Number(s.periodno) === Number(periodNo) &&
        s.perioddate && s.perioddate.split('T')[0] === dateStr
    );
  }, [sections]);

  // Kiểm tra trùng lịch
  const checkScheduleConflict = useCallback((classId, periodNo, date, teacherId, excludePeriodId = null) => {
    const dateStr = new Date(date).toISOString().split('T')[0];
    
    // Kiểm tra trùng lịch lớp (một lớp không thể học 2 môn cùng lúc)
    const classConflict = sections.some(section => {
      if (excludePeriodId && section.periodid === excludePeriodId) return false;
      
      let sectionDateStr;
      if (section.perioddate.includes('T')) {
        sectionDateStr = section.perioddate.split('T')[0];
      } else {
        sectionDateStr = section.perioddate;
      }
      
      return Number(section.classid) === Number(classId) &&
             Number(section.periodno || section.period) === Number(periodNo) &&
             sectionDateStr === dateStr;
    });

    // Kiểm tra trùng lịch giáo viên (một giáo viên không thể dạy 2 lớp cùng lúc)
    const teacherConflict = sections.some(section => {
      if (excludePeriodId && section.periodid === excludePeriodId) return false;
      
      let sectionDateStr;
      if (section.perioddate.includes('T')) {
        sectionDateStr = section.perioddate.split('T')[0];
      } else {
        sectionDateStr = section.perioddate;
      }
      
      return Number(section.teacherid) === Number(teacherId) &&
             Number(section.periodno || section.period) === Number(periodNo) &&
             sectionDateStr === dateStr;
    });

    return { classConflict, teacherConflict };
  }, [sections]);

  const handleCellClick = useCallback((classId, periodNo, date) => {
    const existingSection = getSectionForCell(classId, periodNo, date);
    const isPast = isDateInPast(date);
    
    if (existingSection) {
      // Nếu đã có tiết học, mở modal sửa
      setSelectedCell({ classId, periodNo, date });
      setForm({
        subjectid: existingSection.subjectid.toString(),
        teacherid: existingSection.teacherid.toString()
      });
      setIsEditMode(true);
      setShowModal(true);
    } else {
      // Nếu chưa có, mở modal thêm mới
      setSelectedCell({ classId, periodNo, date });
      setForm({ subjectid: '', teacherid: '' });
      setIsEditMode(false);
      setShowModal(true);
    }
  }, [getSectionForCell, isDateInPast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.subjectid || !form.teacherid) {
      toast.error('Vui lòng chọn môn học và giáo viên');
      return;
    }

    // Kiểm tra token
    const token = getTokenFromStorage();
    if (!token) {
      toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }

    const excludePeriodId = isEditMode ? getSectionForCell(selectedCell.classId, selectedCell.periodNo, selectedCell.date)?.periodid : null;
    const conflicts = checkScheduleConflict(
      selectedCell.classId, 
      selectedCell.periodNo, 
      selectedCell.date, 
      form.teacherid,
      excludePeriodId
    );

    if (conflicts.classConflict) {
      toast.error('Lớp này đã có tiết học vào thời gian này');
      return;
    }

    if (conflicts.teacherConflict) {
      toast.error('Giáo viên này đã có lịch dạy vào thời gian này');
      return;
    }

    try {
      setLoading(true);
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode 
        ? `${API_URL}/api/periods/${excludePeriodId}`
        : `${API_URL}/api/periods`;

      // Format date to match API requirements
      const date = new Date(selectedCell.date);
      // Set time to noon (12:00:00) to avoid timezone issues
      date.setHours(12, 0, 0, 0);
      const formattedDate = date.toISOString().split('.')[0]; // Remove milliseconds

      // Validate all required fields
      const subjectid = Number(form.subjectid);
      const periodno = Number(selectedCell.periodNo);
      const classid = Number(selectedCell.classId);
      const teacherid = Number(form.teacherid);

      if (!subjectid || !periodno || !classid || !teacherid) {
        throw new Error('Thiếu thông tin bắt buộc');
      }

      // Format body theo yêu cầu của API
      const body = {
        periodid: isEditMode ? Number(excludePeriodId) : 0,
        subjectid,
        periodno,
        classid,
        teacherid,
        perioddate: formattedDate,
        class: null,
        evaluations: [],
        subject: null,
        teacher: null
      };

      console.log('Request body:', body);

      const res = await fetch(url, {
        method,
        headers: { 
          ...getAuthHeaders(),
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });

      // Kiểm tra lỗi 401
      if (res.status === 401) {
        localStorage.removeItem('token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      const responseText = await res.text();
      console.log('API Response:', responseText);

      if (!res.ok) {
        // Try to parse error message if it's JSON
        let errorMessage;
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.message || errorJson.title || responseText;
        } catch {
          errorMessage = responseText;
        }
        throw new Error(errorMessage);
      }

      // Reload periods tuần hiện tại
      await fetchPeriodsForCurrentWeek();
      setShowModal(false);
      setSelectedCell(null);
      setIsEditMode(false);
      toast.success(`${isEditMode ? 'Sửa' : 'Thêm'} tiết học thành công!`);
    } catch (err) {
      console.error('API Error:', err);
      if (err.message.includes('401') || err.status === 401) {
        localStorage.removeItem('token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        toast.error(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = useCallback(async (periodId) => {
    setSectionToDelete(periodId);
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = async () => {
    try {
      setLoading(true);

      // Kiểm tra token
      const token = getTokenFromStorage();
      if (!token) {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      const res = await fetch(`${API_URL}/api/periods/${sectionToDelete}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      // Kiểm tra lỗi 401
      if (res.status === 401) {
        localStorage.removeItem('token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      if (!res.ok) throw new Error('Xóa tiết học thất bại');
      // Reload periods tuần hiện tại
      await fetchPeriodsForCurrentWeek();
      toast.success('Xóa tiết học thành công!');
      // Đóng tất cả các modal
      setShowDeleteModal(false);
      setShowModal(false);
      setSelectedCell(null);
      setIsEditMode(false);
      setSectionToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      if (err.message.includes('401') || err.status === 401) {
        localStorage.removeItem('token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        toast.error(err.message || 'Có lỗi xảy ra khi xóa tiết học');
      }
    } finally {
      setLoading(false);
    }
  };

  // Thêm hàm để đóng tất cả modal
  const closeAllModals = useCallback(() => {
    setShowModal(false);
    setShowDeleteModal(false);
    setSelectedCell(null);
    setIsEditMode(false);
    setSectionToDelete(null);
  }, []);

  const renderCell = useCallback((classId, periodNo, date) => {
    const section = getSectionForCell(classId, periodNo, date);
    const isPast = isDateInPast(date);
    
    if (!section) {
      return (
        <div 
          className={`h-20 border border-gray-200 ${isPast ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'} cursor-pointer flex items-center justify-center text-xs text-gray-500`}
          onClick={() => handleCellClick(classId, periodNo, date)}
        >
          +
        </div>
      );
    }

    // Kiểm tra và hiển thị thông tin môn học và giáo viên
    const subjectName = section ? getSubjectNameById(section.subjectid) : '-';
    const teacherFullname = section ? getTeacherFullnameById(section.teacherid) : '-';
    // Lấy evaluations cho tiết học này - ưu tiên match theo periodId
    let evals = [];
    if (section) {
      // Cách 1: Match theo periodId (chính xác nhất)
      evals = getEvaluationsForSection(section.periodid);
      
      // Cách 2: Nếu không có, thử match theo classId + periodno + date (backup)
      if (evals.length === 0) {
        evals = getEvaluationsForPeriod(classId, periodNo, date);
        if (evals.length > 0) {
          console.log(`🔄 Fallback match found ${evals.length} evaluations for classId=${classId}, periodNo=${periodNo}, date=${date}`);
        }
      }
      
      // Debug log for cells with evaluations only
      if (section.periodid && evals.length > 0) {
        console.log(`✅ Cell has ${evals.length} evaluations: periodId=${section.periodid}, class=${classId}, period=${periodNo}`);
      }
    }
    
    // Phân loại evaluations theo tích cực/tiêu cực
    const positiveEvals = evals.filter(e => {
      // API mới có thể đã include activity info trong evaluation response
      if (e.activity && typeof e.activity === 'object') {
        return !e.activity.isNegative;
      }
      // Fallback: tìm trong activities array nếu có
      if (Array.isArray(activities) && e.activityid) {
        const activity = activities.find(act => act.activityid === e.activityid);
        return !activity?.isnegative;
      }
      // Default: assume positive if no activity info
      return true;
    });
    const negativeEvals = evals.filter(e => {
      // API mới có thể đã include activity info trong evaluation response
      if (e.activity && typeof e.activity === 'object') {
        return e.activity.isNegative;
      }
      // Fallback: tìm trong activities array nếu có
      if (Array.isArray(activities) && e.activityid) {
        const activity = activities.find(act => act.activityid === e.activityid);
        return activity?.isnegative;
      }
      // Default: assume not negative if no activity info
      return false;
    });

    return (
      <div 
        className={`h-20 border border-gray-200 ${isPast ? 'bg-yellow-50 hover:bg-yellow-100' : 'bg-blue-50 hover:bg-blue-100'} cursor-pointer p-1 flex flex-col justify-between`}
        onClick={() => handleCellClick(classId, periodNo, date)}
      >
        <div className="flex-1">
          <div className={`text-xs font-medium ${isPast ? 'text-yellow-800' : 'text-blue-800'} truncate`}>
            Môn học: {subjectName !== '-' ? subjectName : 'Chưa có môn'}
          </div>
          <div className={`text-xs ${isPast ? 'text-yellow-600' : 'text-blue-600'} truncate`}>
          Giáo viên: {teacherFullname !== '-' ? teacherFullname : 'Chưa có GV'}
          </div>
        </div>
        
        {/* Hiển thị thông tin đánh giá */}
        <div className="text-xs">
          {evals.length > 0 ? (
            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                {positiveEvals.length > 0 && (
                  <span className="bg-green-100 text-green-700 px-1 rounded text-xs">
                    +{positiveEvals.length}
                  </span>
                )}
                {negativeEvals.length > 0 && (
                  <span className="bg-red-100 text-red-700 px-1 rounded text-xs">
                    -{negativeEvals.length}
                  </span>
                )}
              </div>
              <span className="text-gray-600 font-medium">
                Có {evals.length} đánh giá
              </span>
            </div>
          ) : (
            <div className="text-gray-500 text-center">
              Chưa có đánh giá
            </div>
          )}
        </div>
      </div>
    );
  }, [getSectionForCell, handleCellClick, getSubjectNameById, getTeacherFullnameById, isDateInPast, evaluations]);

  const generateWeekDates = useMemo(() => {
    if (!selectedWeek) return [];
    
    const dates = [];
    const startDate = new Date(selectedWeek);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  }, [selectedWeek]);

  const weekDates = generateWeekDates;
  const weekSections = sectionsForWeek;

  // Lọc lớp để hiển thị
  const displayClasses = useMemo(() => {
    return selectedClass === 'all' ? classes : classes.filter(c => c.classid === Number(selectedClass));
  }, [classes, selectedClass]);

  return (
    <div className="flex-1 p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-semibold mb-6">Quản lý tiết học</h2>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Chọn năm học, tuần, lớp */}
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
          <label className="block text-sm font-medium text-gray-700">Chọn lớp:</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả các lớp</option>
            {(Array.isArray(classes) ? classes : []).map(cls => (
              <option key={cls.classid} value={cls.classid}>{cls.classname}</option>
            ))}
          </select>
        </div>

        {periodsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : periodsError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Lỗi tải dữ liệu</h3>
                <p className="mt-1 text-sm text-red-600">{periodsError}</p>
                {periodsError.includes('token') && (
                  <div className="mt-3">
                    <button 
                      onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                      }}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Đăng nhập lại
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700 min-w-[150px]">
                    Tiết
                  </th>
                  {(() => {
                    // Tạo mảng ngày trong tuần từ selectedWeek
                    if (!selectedWeek) return null;
                    const weekStart = new Date(selectedWeek.start);
                    const weekDates = [];
                    for (let i = 0; i < 7; i++) {
                      const d = new Date(weekStart);
                      d.setDate(weekStart.getDate() + i);
                      weekDates.push(d);
                    }
                    return weekDates.map((date, index) => (
                      <th key={index} className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 min-w-[120px]">
                        <div>{getDayOfWeek(date)}</div>
                        <div className="text-xs text-gray-500">{date.toLocaleDateString('vi-VN')}</div>
                      </th>
                    ));
                  })()}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot.period}>
                    <td className="border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50">
                      <div>Tiết {slot.period}</div>
                      <div className="text-xs text-gray-500">
                        {slot.start} - {slot.end}
                      </div>
                    </td>
                    {(() => {
                      // Tạo mảng ngày trong tuần từ selectedWeek
                      if (!selectedWeek) return null;
                      const weekStart = new Date(selectedWeek.start);
                      const weekDates = [];
                      for (let i = 0; i < 7; i++) {
                        const d = new Date(weekStart);
                        d.setDate(weekStart.getDate() + i);
                        weekDates.push(d);
                      }
                      return weekDates.map((date, dateIndex) => (
                        <td key={dateIndex} className="border border-gray-300 p-0">
                          <div className="grid grid-cols-1">
                            {(Array.isArray(displayClasses) ? displayClasses : []).map((cls, idx) => (
                              <div key={cls.classid} className="border-b border-gray-200 last:border-b-0">
                                <div className="text-xs text-gray-500 px-2 py-1 bg-gray-50">
                                  {cls.classname}
                                </div>
                                {renderCell(cls.classid, slot.period, date)}
                              </div>
                            ))}
                          </div>
                        </td>
                      ));
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal thêm/sửa tiết học */}
      {showModal && selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {isEditMode ? 'Chi tiết tiết học' : 'Thêm tiết học'}
            </h3>
            
            <div className="mb-4 text-sm text-gray-600">
              <p>Lớp: {classes.find(c => c.classid === selectedCell.classId)?.classname}</p>
              <p>Tiết: {selectedCell.periodNo}</p>
              <p>Thời gian: {timeSlots.find(s => s.period === selectedCell.periodNo)?.start} - {timeSlots.find(s => s.period === selectedCell.periodNo)?.end}</p>
              <p>Ngày: {new Date(selectedCell.date).toLocaleDateString('vi-VN')}</p>
            </div>

            {/* Hiển thị đánh giá cho tất cả tiết học (cả quá khứ và tương lai) */}
            {isEditMode && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Đánh giá tiết học</h4>
                {(() => {
                  const section = getSectionForCell(selectedCell.classId, selectedCell.periodNo, selectedCell.date);
                  // Sử dụng evaluations có sẵn từ state
                  const sectionEvaluations = section ? getEvaluationsForSection(section.periodid) : [];
                  
                  if (sectionEvaluations.length === 0) {
                    return (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-500">
                        <div className="flex items-center justify-between">
                          <span>Chưa có đánh giá nào cho tiết học này.</span>
                          {section && (
                            <button 
                              onClick={async () => {
                                // Refresh evaluations cho period này
                                const params = new URLSearchParams();
                                params.append('PeriodId', section.periodid);
                                params.append('page', '1');
                                params.append('pageSize', '100');
                                
                                try {
                                  const res = await fetch(`${API_URL}/api/evaluations?${params.toString()}`, {
                                    headers: getAuthHeaders()
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    const newEvals = Array.isArray(data.items) ? data.items : [];
                                    
                                    // Cập nhật state evaluations
                                    setEvaluations(prev => {
                                      // Remove old evaluations for this period
                                      const filtered = prev.filter(e => {
                                        const evalPeriodId = e.periodid || e.PeriodId || e.periodId;
                                        return Number(evalPeriodId) !== Number(section.periodid);
                                      });
                                      // Add new evaluations
                                      return [...filtered, ...newEvals];
                                    });
                                    
                                    toast.success(`Đã tải lại ${newEvals.length} đánh giá cho tiết học này`);
                                  } else {
                                    toast.info('Không có đánh giá mới nào');
                                  }
                                } catch (err) {
                                  toast.error('Lỗi khi tải lại đánh giá');
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 underline text-sm px-2 py-1"
                            >
                              🔄 Tải lại
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Phân loại đánh giá
                  const positiveEvaluations = sectionEvaluations.filter(e => {
                    // API mới có thể đã include activity info trong evaluation response
                    if (e.activity && typeof e.activity === 'object') {
                      return !e.activity.isNegative;
                    }
                    // Fallback: tìm trong activities array nếu có
                    if (Array.isArray(activities) && e.activityid) {
                      const activity = activities.find(act => act.activityid === e.activityid);
                      return !activity?.isnegative;
                    }
                    return true; // default positive
                  });
                  
                  const negativeEvaluations = sectionEvaluations.filter(e => {
                    // API mới có thể đã include activity info trong evaluation response
                    if (e.activity && typeof e.activity === 'object') {
                      return e.activity.isNegative;
                    }
                    // Fallback: tìm trong activities array nếu có
                    if (Array.isArray(activities) && e.activityid) {
                      const activity = activities.find(act => act.activityid === e.activityid);
                      return activity?.isnegative;
                    }
                    return false; // default not negative
                  });

                  return (
                    <div className="space-y-4">
                      {/* Thống kê tóm tắt */}
                      <div className="flex gap-4 mb-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex-1">
                          <div className="text-green-800 font-semibold">Đánh giá tích cực</div>
                          <div className="text-2xl font-bold text-green-600">{positiveEvaluations.length}</div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex-1">
                          <div className="text-red-800 font-semibold">Đánh giá tiêu cực</div>
                          <div className="text-2xl font-bold text-red-600">{negativeEvaluations.length}</div>
                        </div>
                      </div>

                      {/* Danh sách chi tiết đánh giá */}
                      <div className="max-h-96 overflow-y-auto space-y-3">
                        {sectionEvaluations.map((evaluation, idx) => {
                          const isNegative = getEvaluationType(evaluation) === 'negative';
                          return (
                            <div 
                              key={evaluation.evaluationId || evaluation.evaluationid || idx} 
                              className={`border rounded-lg p-4 ${
                                isNegative ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    isNegative 
                                      ? 'bg-red-100 text-red-800' 
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {isNegative ? 'Tiêu cực' : 'Tích cực'}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {new Date(evaluation.createdAt || evaluation.createdat).toLocaleString('vi-VN')}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm text-gray-800 mb-3 whitespace-pre-line">
                                {evaluation.content}
                              </div>
                              {evaluation.students && evaluation.students.length > 0 && (
                                <div className="text-sm text-gray-600">
                                  <strong>Học sinh ({evaluation.students.length}):</strong> {getStudentNames(evaluation)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Form chỉ hiển thị nếu là tiết học tương lai hoặc chưa có tiết học */}
            {(!isEditMode || !isDateInPast(selectedCell.date)) && (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Môn học</label>
                  <select
                    name="subjectid"
                    value={form.subjectid}
                    onChange={(e) => setForm({...form, subjectid: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isDateInPast(selectedCell.date)}
                  >
                    <option value="">-- Chọn môn học --</option>
                    {subjects.map(sub => (
                      <option key={sub.subjectid} value={sub.subjectid}>{sub.subjectname}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giáo viên</label>
                  <select
                    name="teacherid"
                    value={form.teacherid}
                    onChange={(e) => setForm({...form, teacherid: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!form.subjectid || isDateInPast(selectedCell.date)}
                  >
                    <option value="">-- Chọn giáo viên --</option>
                    {form.subjectid && teachers
                      .filter(t => t.subjectid === Number(form.subjectid))
                      .map(t => {
                        const u = userAccounts.find(u => u.userid === t.userid);
                        return (
                          <option key={t.teacherid} value={t.teacherid}>
                            {u ? u.fullname : `GV ${t.teacherid}`}
                          </option>
                        );
                      })
                    }
                  </select>
                </div>
                <div className="flex justify-end gap-4">
                  {isEditMode && !isDateInPast(selectedCell.date) && (
                    <button
                      type="button"
                      onClick={() => {
                        const existingSection = getSectionForCell(selectedCell.classId, selectedCell.periodNo, selectedCell.date);
                        if (existingSection) {
                          handleDelete(existingSection.periodid);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      disabled={loading}
                    >
                      Xóa
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeAllModals}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                    disabled={loading}
                  >
                    Đóng
                  </button>
                  {!isDateInPast(selectedCell.date) && (
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      disabled={loading || !form.subjectid || !form.teacherid}
                    >
                      {isEditMode ? 'Lưu thay đổi' : 'Thêm tiết học'}
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Nút đóng cho tiết học đã qua */}
            {isEditMode && isDateInPast(selectedCell.date) && (
              <div className="flex justify-end">
                <button
                  onClick={closeAllModals}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Xác nhận xóa</h3>
            <p className="mb-4">Bạn có chắc chắn muốn xóa tiết học này?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={closeAllModals}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={loading}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManagement;