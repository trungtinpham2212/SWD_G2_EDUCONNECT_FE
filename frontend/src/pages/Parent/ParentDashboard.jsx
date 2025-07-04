import React, { useEffect, useState } from 'react';
import API_URL from '../../config/api';

const ParentDashboard = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date('2024-12-02'));
  const [parentDetails, setParentDetails] = useState(null);

  // Lấy thông tin user từ localStorage nếu chưa có
  const [loggedInUser, setLoggedInUser] = useState(user || null);
  useEffect(() => {
    if (!loggedInUser) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          setLoggedInUser(JSON.parse(userStr));
        } catch {}
      }
    }
  }, [loggedInUser]);

  // Nếu là phụ huynh, gọi API để lấy thông tin chi tiết (bao gồm cả students)
  useEffect(() => {
    if (loggedInUser && loggedInUser.roleId === 3 && loggedInUser.userId) {
      const fetchParentDetails = async () => {
        try {
          setLoading(true);
          const res = await fetch(`${API_URL}/api/user-accounts/${loggedInUser.userId}`);
          if (!res.ok) {
            throw new Error('Không thể tải thông tin phụ huynh');
          }
          const data = await res.json();
          setParentDetails(data);
          // Nếu có students, setChildren luôn
          if (Array.isArray(data.students) && data.students.length > 0) {
            setChildren(data.students);
            setSelectedChildId(data.students[0].studentId);
          } else {
            setChildren([]);
          }
        } catch (err) {
          console.error('Error fetching parent details:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchParentDetails();
    }
  }, [loggedInUser]);

  // Lấy periods, subjects, classes khi có selectedChildId
  useEffect(() => {
    if (!selectedChildId || !loggedInUser || loggedInUser.roleId !== 3) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // Lấy thông tin học sinh được chọn
        const selectedStudent = children.find(c => c.studentId === selectedChildId);
        if (!selectedStudent) {
          throw new Error('Không tìm thấy thông tin học sinh');
        }
        // Lấy tất cả periods (gộp nhiều trang)
        let allPeriods = [];
        let page = 1;
        let totalPages = 1;
        do {
          const periodRes = await fetch(`${API_URL}/api/periods?page=${page}&pageSize=50`);
          if (!periodRes.ok) throw new Error('Không thể tải periods');
          const periodsRaw = await periodRes.json();
          const items = Array.isArray(periodsRaw.items) ? periodsRaw.items : [];
          allPeriods = allPeriods.concat(items);
          totalPages = periodsRaw.totalPages || 1;
          page++;
        } while (page <= totalPages);
        // Lấy subjects và classes (1 trang là đủ)
        const [subjectRes, classRes] = await Promise.all([
          fetch(`${API_URL}/api/subjects?page=1&pageSize=100`),
          fetch(`${API_URL}/api/classes?page=1&pageSize=100`)
        ]);
        if (!subjectRes.ok || !classRes.ok) throw new Error('Không thể tải subjects/classes');
        const subjectsData = await subjectRes.json();
        const classesData = await classRes.json();
        setPeriods(allPeriods);
        setSubjects(Array.isArray(subjectsData.items) ? subjectsData.items : []);
        setClasses(Array.isArray(classesData.items) ? classesData.items : []);
      } catch (err) {
        console.error('Error fetching schedule data:', err);
        setError('Không thể tải dữ liệu thời khóa biểu');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedChildId, children, loggedInUser]);

  // Helper lấy tên môn học và tên lớp
  const getSubjectName = (subjectid) => {
    const subject = subjects.find(s => s.subjectid === subjectid);
    return subject ? subject.subjectname : `Môn ${subjectid}`;
  };
  
  const getClassName = (classId) => {
    const child = children.find(c => c.class && c.class.classId === classId);
    return child && child.class ? child.class.className : `Lớp ${classId}`;
  };

  // Helper tuần
  const getWeekDates = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };
  
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const formatDateVN = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };
  
  const getDayName = (date) => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[date.getDay()];
  };

  // Time slots
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

  // Lấy periods của lớp con đang chọn trong tuần hiện tại
  const selectedChild = children.find(c => c.studentId === selectedChildId);
  let classPeriods = [];
  if (selectedChild) {
    const { start, end } = getWeekDates(currentWeek);
    const startStr = formatDate(start);
    const endStr = formatDate(end);
    // Lấy đúng classId để so sánh
    const childClassId = selectedChild.class?.classId || selectedChild.classId;
    classPeriods = periods.filter(p => {
      const dateStr = p.perioddate.split('T')[0];
      // So sánh classid với classId của học sinh
      return Number(p.classid) === Number(childClassId) && dateStr >= startStr && dateStr <= endStr;
    });
    // Debug log
    console.log('Lịch học lọc được:', classPeriods);
  }

  // Render schedule grid
  const renderScheduleGrid = () => {
    if (!selectedChild) return null;
    const { start } = getWeekDates(currentWeek);
    return timeSlots.map((slot) => (
      <div key={slot.period} className="flex min-w-full border-b">
        <div className="w-[120px] shrink-0 p-3 text-center border-r bg-gray-50">
          <div className="font-medium text-gray-800">Tiết {slot.period}</div>
          <div className="text-xs text-gray-600">
            {slot.start} - {slot.end}
          </div>
        </div>
        {Array.from({ length: 7 }, (_, dayIndex) => {
          const date = new Date(start);
          date.setDate(start.getDate() + dayIndex);
          const cellDateStr = formatDate(date);
          const period = classPeriods.find(p => {
            const periodDateStr = p.perioddate.split('T')[0];
            return periodDateStr === cellDateStr && Number(p.periodno) === Number(slot.period);
          });
          return (
            <div key={dayIndex} className="flex-1 min-w-[130px] p-2 border-r hover:bg-gray-50">
              {period && (
                <div className="h-full p-2 rounded bg-blue-100 text-sm transition-colors hover:bg-blue-200">
                  <div className="font-medium text-blue-900">
                    {getSubjectName(period.subjectid)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {(() => {
                      const childClassId = selectedChild.class?.classId || selectedChild.classId;
                      if (Number(period.classid) === Number(childClassId)) {
                        return selectedChild.class?.className || selectedChild.className || `Lớp ${childClassId}`;
                      }
                      return getClassName(period.classid);
                    })()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    ));
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  if (loading && (!loggedInUser || loggedInUser.roleId === 3)) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Đang tải dữ liệu...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">{error}</div>
        </div>
      </div>
    );
  }

  if (loggedInUser && loggedInUser.roleId === 3) {
    if (!children.length) {
       return <div className="flex-1 p-6">
        <h2 className="text-2xl font-semibold mb-6">Xin chào {loggedInUser.userName}, chúc bạn một ngày tốt lành!</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-600">
         Tài khoản của bạn chưa được liên kết với học sinh nào.
        </div>
      </div>
    }
    return (
      <div className="flex-1 p-6">
        <h2 className="text-2xl font-semibold mb-6">Xin chào {loggedInUser.userName}, chúc bạn một ngày tốt lành!</h2>
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn con để xem thời khóa biểu:</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={selectedChildId || ''}
              onChange={e => setSelectedChildId(Number(e.target.value))}
            >
              {children.map(child => (
                <option key={child.studentId} value={child.studentId}>
                  {child.name} - {child.class?.className || getClassName(child.classId)}
                </option>
              ))}
            </select>
          </div>
          {selectedChild && (
            <div>
              <div className="flex items-center space-x-4 mb-4">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  &#8592; Tuần trước
                </button>
                <div className="flex items-center bg-white px-4 py-2 rounded-lg shadow-sm">
                  <span className="font-medium">
                    {formatDateVN(getWeekDates(currentWeek).start)} - {formatDateVN(getWeekDates(currentWeek).end)}
                  </span>
                </div>
                <button
                  onClick={() => navigateWeek('next')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Tuần sau &#8594;
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <div className="min-w-full">
                  <div className="flex min-w-full border-b">
                    <div className="w-[120px] shrink-0 p-3 text-center border-r bg-gray-50 font-semibold text-gray-800">
                      Tiết
                    </div>
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date(getWeekDates(currentWeek).start);
                      date.setDate(date.getDate() + i);
                      return (
                        <div key={i} className="flex-1 min-w-[130px] text-center p-3 border-b border-r">
                          <div className="font-semibold text-gray-800">{getDayName(date)}</div>
                          <div className="text-sm text-gray-600">{formatDateVN(date)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="min-w-full">
                    {renderScheduleGrid()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
};
export default ParentDashboard; 