import React, { useEffect, useState, useMemo, useCallback } from 'react';
import API_URL from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

  // Cache cho dữ liệu
  const subjectsMap = useMemo(() => {
    return subjects.reduce((acc, sub) => {
      acc[sub.subjectid] = sub.subjectname;
      return acc;
    }, {});
  }, [subjects]);

  const teachersMap = useMemo(() => {
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

  // Helper function to get evaluations for a specific section
  const getEvaluationsForSection = useCallback((periodId) => {
    return evaluations.filter(evaluation => evaluation.periodid === periodId);
  }, [evaluations]);

  // Helper function to get evaluation type
  const getEvaluationType = useCallback((evaluation) => {
    const activity = activities.find(act => act.activityid === evaluation.activityid);
    return activity?.isnegative ? 'negative' : 'positive';
  }, [activities]);

  // Helper function to get student preview
  const getStudentPreview = useCallback((evaluation) => {
    if (!evaluation?.students?.length) return '(0)';
    
    const firstStudent = evaluation.students[0];
    if (!firstStudent?.classid) return `(${evaluation.students.length})`;

    const classStudents = evaluations
      .filter(e => e.students?.length > 0 && e.students[0].classid === firstStudent.classid)
      .flatMap(e => e.students);
    
    const uniqueStudents = new Set(classStudents.map(s => s.studentid));
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
    if (!firstStudent?.classid) return evaluation.students.map(student => student.name || `Học sinh ${student.studentid}`).join(', ');

    // Lấy danh sách học sinh trong lớp đó
    const classStudents = evaluations
      .filter(e => e.students?.length > 0 && e.students[0].classid === firstStudent.classid)
      .flatMap(e => e.students);
    
    // Lấy số lượng học sinh duy nhất trong lớp
    const uniqueStudents = new Set(classStudents.map(s => s.studentid));
    const classSize = uniqueStudents.size;
    
    // Nếu số học sinh trong đánh giá bằng sĩ số lớp
    if (evaluation.students.length === classSize) {
      return 'Cả lớp';
    }
    
    // Nếu không phải cả lớp, hiển thị danh sách tên
    return evaluation.students.map(student => student.name || `Học sinh ${student.studentid}`).join(', ');
  }, [evaluations]);

  // Fetch static data (classes, subjects, teachers, userAccounts, activities, students) only once
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        setLoading(true);
        const [subjectRes, classRes, teacherRes, userRes, activityRes, schoolYearRes, studentRes] = await Promise.all([
          fetch(`${API_URL}/api/subjects`),
          fetch(`${API_URL}/api/classes`),
          fetch(`${API_URL}/api/teachers`),
          fetch(`${API_URL}/api/user-accounts`),
          fetch(`${API_URL}/api/activities`),
          fetch(`${API_URL}/api/school-years`),
          fetch(`${API_URL}/api/students`)
        ]);
        if (!subjectRes.ok || !classRes.ok || !teacherRes.ok || !userRes.ok || !activityRes.ok || !schoolYearRes.ok || !studentRes.ok) {
          throw new Error('Một hoặc nhiều API call thất bại');
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
        setSubjects(subjectData);
        setClasses(classData);
        setTeachers(teacherData);
        setUserAccounts(userData);
        setActivities(activityData);
        setSchoolYears(schoolYearData);
        setStudents(studentData);
        setError(null);
        // Mặc định chọn năm học chứa ngày 2/12/2024
        const defaultDate = new Date('2024-12-02');
        let foundYear = schoolYearData.find(sy => {
          const [startYear, endYear] = sy.year.split('-').map(Number);
          const start = new Date(`${startYear}-09-02`);
          const end = new Date(`${endYear}-05-31`);
          return defaultDate >= start && defaultDate <= end;
        });
        if (!foundYear && schoolYearData.length > 0) foundYear = schoolYearData[0];
        setSelectedSchoolYear(foundYear?.schoolyearid || null);
      } catch (err) {
        setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
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

  // Fetch periods và evaluations theo tuần và lớp (by-range-class)
  useEffect(() => {
    if (!selectedWeek) return;
    const fetchPeriodsAndEvaluations = async () => {
      try {
        setPeriodsLoading(true);
        setPeriodsError(null);
        let allSections = [];
        if (selectedClass === 'all') {
          // Gọi cho từng classId
          const promises = classes.map(cls =>
            fetch(`${API_URL}/api/periods/by-range-class?startDate=${selectedWeek.start}&endDate=${selectedWeek.end}&classId=${cls.classid}`)
          );
          const results = await Promise.all(promises);
          const jsons = await Promise.all(results.map(r => r.ok ? r.json() : []));
          allSections = jsons.flat();
        } else {
          const res = await fetch(`${API_URL}/api/periods/by-range-class?startDate=${selectedWeek.start}&endDate=${selectedWeek.end}&classId=${selectedClass}`);
          if (!res.ok) throw new Error('Không thể tải dữ liệu tiết học');
          allSections = await res.json();
        }
        // Chuẩn hóa dữ liệu sections
        const normalizedSections = allSections.map(section => ({
          ...section,
          classid: Number(section.classid),
          subjectid: Number(section.subjectid),
          teacherid: Number(section.teacherid),
          period: Number(section.periodno || section.period),
          perioddate: section.perioddate.includes('T') 
            ? section.perioddate.split('T')[0] 
            : section.perioddate
        }));
        setSections(normalizedSections);
        // Fetch evaluations theo tuần
        const evalRes = await fetch(`${API_URL}/api/evaluations/by-date-range?startDate=${selectedWeek.start}&endDate=${selectedWeek.end}`);
        if (evalRes.ok) {
          const evalData = await evalRes.json();
          setEvaluations(evalData);
        } else {
          setEvaluations([]);
        }
      } catch (err) {
        setSections([]);
        setEvaluations([]);
        setPeriodsError('Không thể tải dữ liệu tiết học cho tuần này.');
      } finally {
        setPeriodsLoading(false);
      }
    };
    fetchPeriodsAndEvaluations();
  }, [selectedWeek, selectedClass, classes]);

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
    const dateStr = new Date(date).toISOString().split('T')[0];
    const key = `${Number(classId)}-${Number(periodNo)}-${dateStr}`;
    return sectionsByCell[key];
  }, [sectionsByCell]);

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
             Number(section.period) === Number(periodNo) &&
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
             Number(section.period) === Number(periodNo) &&
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
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });

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

      // Reload data
      const sectionRes = await fetch(`${API_URL}/api/periods`);
      if (!sectionRes.ok) {
        throw new Error('Không thể tải lại dữ liệu tiết học');
      }
      const sectionData = await sectionRes.json();
      setSections(sectionData);
      
      setShowModal(false);
      setSelectedCell(null);
      setIsEditMode(false);
      toast.success(`${isEditMode ? 'Sửa' : 'Thêm'} tiết học thành công!`);
    } catch (err) {
      console.error('API Error:', err);
      toast.error(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
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
      const res = await fetch(`${API_URL}/api/periods/${sectionToDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa tiết học thất bại');
      
      setSections(sections.filter(s => s.periodid !== sectionToDelete));
      toast.success('Xóa tiết học thành công!');

      // Đóng tất cả các modal
      setShowDeleteModal(false);
      setShowModal(false);
      setSelectedCell(null);
      setIsEditMode(false);
      setSectionToDelete(null);
    } catch (err) {
      toast.error(err.message);
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
    const subjectName = getSubjectName(section.subjectid);
    const teacherName = getTeacherName(section.teacherid);

    // Kiểm tra đánh giá cho tiết học
    const sectionEvaluations = getEvaluationsForSection(section.periodid);
    const evaluationCount = sectionEvaluations.length;

    return (
      <div 
        className={`h-20 border border-gray-200 ${isPast ? 'bg-yellow-50 hover:bg-yellow-100' : 'bg-blue-50 hover:bg-blue-100'} cursor-pointer p-2 flex flex-col justify-center`}
        onClick={() => handleCellClick(classId, periodNo, date)}
      >
        <div className={`text-xs font-medium ${isPast ? 'text-yellow-800' : 'text-blue-800'}`}>
          {subjectName !== '-' ? subjectName : 'Chưa có môn học'}
        </div>
        <div className={`text-xs ${isPast ? 'text-yellow-600' : 'text-blue-600'}`}>
          {teacherName !== '-' ? 'Giáo viên: ' + teacherName : 'Chưa có giáo viên'}
        </div>
        <div className={`text-xs font-medium mt-1 ${evaluationCount > 0 ? 'text-green-600' : 'text-gray-500'}`}>
          {evaluationCount > 0 ? `Có ${evaluationCount} đánh giá` : 'Chưa có đánh giá'}
        </div>
      </div>
    );
  }, [getSectionForCell, handleCellClick, getSubjectName, getTeacherName, isDateInPast, getEvaluationsForSection]);

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
            {classes.map(cls => (
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{periodsError}</div>
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
                            {displayClasses.map(cls => (
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

            {/* Hiển thị đánh giá nếu là tiết học đã qua */}
            {isEditMode && isDateInPast(selectedCell.date) && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Đánh giá tiết học</h4>
                {(() => {
                  const section = getSectionForCell(selectedCell.classId, selectedCell.periodNo, selectedCell.date);
                  const sectionEvaluations = section ? getEvaluationsForSection(section.periodid) : [];
                  
                  if (sectionEvaluations.length === 0) {
                    return (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-500">
                        Chưa có đánh giá nào cho tiết học này.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {sectionEvaluations.map((evaluation, idx) => (
                        <div key={evaluation.evaluationid} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                getEvaluationType(evaluation) === 'negative' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {getEvaluationType(evaluation) === 'negative' ? 'Tiêu cực' : 'Tích cực'}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(evaluation.createdat).toLocaleString('vi-VN')}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-800 mb-3 whitespace-pre-line">
                            {evaluation.content}
                          </div>
                          {evaluation.students && evaluation.students.length > 0 && (
                            <div className="text-sm text-gray-600">
                              <strong>Học sinh:</strong> {getStudentNames(evaluation)}
                            </div>
                          )}
                        </div>
                      ))}
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