import React, { useEffect, useState } from 'react';
import API_URL from '../config/api';

const Dashboard = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Lấy thông tin user từ localStorage nếu chưa có
  const [parent, setParent] = useState(user || null);
  useEffect(() => {
    if (!parent) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          setParent(JSON.parse(userStr));
        } catch {}
      }
    }
  }, [parent]);

  // Lấy danh sách con
  useEffect(() => {
    if (!parent) return;
    
    const fetchChildren = async () => {
      try {
        setLoading(true);
        console.log('Fetching children for parent:', parent.userId);
        const res = await fetch(`${API_URL}/api/Student/GetStudentsByParentId/${parent.userId}`);
        const myChildren = await res.json();
        console.log('Children data:', myChildren);
        
        if (Array.isArray(myChildren) && myChildren.length > 0) {
          setChildren(myChildren);
          setSelectedChildId(myChildren[0].studentid);
        } else {
          console.log('No children found or invalid data format');
        }
      } catch (err) {
        console.error('Error fetching children:', err);
        setError('Không thể tải danh sách con');
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, [parent]);

  // Lấy periods, subjects, classes khi có selectedChildId
  useEffect(() => {
    if (!selectedChildId) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching schedule data for child:', selectedChildId);
        
        const [periodRes, subjectRes, classRes] = await Promise.all([
          fetch(`${API_URL}/api/Period/GetPeriodsByStudentId/${selectedChildId}`),
          fetch(`${API_URL}/api/Subject`),
          fetch(`${API_URL}/api/Class`)
        ]);

        const periodsData = await periodRes.json();
        const subjectsData = await subjectRes.json();
        const classesData = await classRes.json();

        console.log('Schedule data:', {
          periods: periodsData,
          subjects: subjectsData,
          classes: classesData
        });

        setPeriods(periodsData);
        setSubjects(subjectsData);
        setClasses(classesData);
      } catch (err) {
        console.error('Error fetching schedule data:', err);
        setError('Không thể tải dữ liệu thời khóa biểu');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedChildId]);

  // Helper lấy tên môn học và tên lớp
  const getSubjectName = (subjectid) => {
    const subject = subjects.find(s => s.subjectid === subjectid);
    return subject ? subject.subjectname : `Môn ${subjectid}`;
  };
  const getClassName = (classid) => {
    const cls = classes.find(c => c.classid === classid);
    return cls ? cls.classname : `Lớp ${classid}`;
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
  const selectedChild = children.find(c => c.studentid === selectedChildId);
  let classPeriods = [];
  if (selectedChild) {
    const { start, end } = getWeekDates(currentWeek);
    const startStr = formatDate(start);
    const endStr = formatDate(end);
    classPeriods = periods.filter(p => {
      const dateStr = p.perioddate.split('T')[0];
      return p.classid === selectedChild.classid && dateStr >= startStr && dateStr <= endStr;
    });
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
                    {getClassName(period.classid)}
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

  if (parent && parent.roleId === 3) {
    return (
      <div className="flex-1 p-6">
        <h2 className="text-2xl font-semibold mb-6">Xin chào {parent.userName}, chúc bạn một ngày tốt lành!</h2>
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn con để xem thời khóa biểu:</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={selectedChildId || ''}
              onChange={e => setSelectedChildId(Number(e.target.value))}
            >
              {children.map(child => (
                <option key={child.studentid} value={child.studentid}>{child.name} - {getClassName(child.classid)}</option>
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

  // ... giữ nguyên phần dashboard cho các role khác ...
  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Trang: {active}</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">
          Chào mừng bạn đến với hệ thống quản lý giáo dục EduConnect
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
