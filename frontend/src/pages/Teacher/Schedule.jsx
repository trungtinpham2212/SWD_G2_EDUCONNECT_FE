import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import API_URL from '../../config/api';
import { useNavigate } from 'react-router-dom';

const Schedule = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [periods, setperiods] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date('2024-12-02'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

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

  // Helper lấy token từ localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch school years
  useEffect(() => {
    const fetchSchoolYears = async () => {
      try {
        const res = await fetch(`${API_URL}/api/school-years`, {
          headers: { ...getAuthHeaders() }
        });
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
      } catch {}
    };
    fetchSchoolYears();
  }, []);

  // Khi chọn năm học, sinh lại danh sách tuần
  useEffect(() => {
    if (!selectedSchoolYear || !schoolYears.length) return;
    const sy = schoolYears.find(sy => sy.schoolyearid === selectedSchoolYear);
    if (!sy) return;
    // generateWeeksForSchoolYear giống admin
    const [startYear, endYear] = sy.year.split('-').map(Number);
    // Lấy ngày 2/9
    let startDate = new Date(`${startYear}-09-02`);
    // Nếu 2/9 không phải thứ 2 thì lùi về thứ 2 gần nhất trước hoặc bằng 2/9
    const dayOfWeek = startDate.getDay(); // 0: CN, 1: T2, ...
    if (dayOfWeek !== 1) {
      const diff = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      startDate.setDate(startDate.getDate() - diff);
    }
    const endDate = new Date(`${endYear}-05-31`);
    const genWeeks = [];
    let current = new Date(startDate);
    let weekNumber = 1;
    while (current <= endDate) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const label = `Tuần ${weekNumber} (${weekStart.toLocaleDateString('vi-VN')} - ${weekEnd.toLocaleDateString('vi-VN')})`;
      genWeeks.push({
        label,
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
        weekNumber
      });
      current.setDate(current.getDate() + 7);
      weekNumber++;
    }
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

  // Fetch subjects and classes
  useEffect(() => {
    const fetchSubjectsAndClasses = async () => {
      try {
        const [subjectRes, classRes] = await Promise.all([
          fetch(`${API_URL}/api/subjects?page=1&pageSize=10`, {
            headers: { ...getAuthHeaders() }
          }),
          fetch(`${API_URL}/api/classes?page=1&pageSize=10`, {
            headers: { ...getAuthHeaders() }
          })
        ]);
        setSubjects(await subjectRes.json());
        setClasses(await classRes.json());
      } catch (err) {}
    };
    fetchSubjectsAndClasses();
  }, []);

  // Lấy teacherId từ user prop hoặc localStorage
  const teacherId = user?.teacherId || Number(localStorage.getItem('teacherId'));

  // Helper chuyển ngày sang MM/DD/YYYY
  function toMMDDYYYY(dateStr) {
    const d = new Date(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  // Fetch periods theo tuần đã chọn
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        setLoading(true);
        if (!teacherId || !selectedWeek) return;
        const url = `${API_URL}/api/periods/by-range?startDate=${toMMDDYYYY(selectedWeek.start)}&endDate=${toMMDDYYYY(selectedWeek.end)}&teacherId=${teacherId}&page=1&pageSize=50`;
        const response = await fetch(url, {
          headers: { ...getAuthHeaders() }
        });
        if (!response.ok) throw new Error('Failed to fetch schedule data');
        const data = await response.json();
        setperiods(data.items || []);
        setError(null);
      } catch (err) {
        setError('Không thể tải dữ liệu lịch dạy. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    fetchPeriods();
  }, [teacherId, selectedWeek]);

  const navigateWeek = (direction) => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  // Helper lấy tên môn học và tên lớp từ dữ liệu trả về
  const getSubjectName = (subjectid, section) => section.subjectName || `Môn ${subjectid}`;
  const getClassName = (classid, section) => section.className || `Lớp ${classid}`;

  // Tạo mảng ngày trong tuần từ selectedWeek
  const getWeekDatesArray = () => {
    if (!selectedWeek) return [];
    const days = [];
    const start = new Date(selectedWeek.start);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Render lại header ngày trong tuần
  const renderWeekHeader = () => {
    const days = getWeekDatesArray();
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    return days.map((date, i) => (
      <div key={i} className="flex-1 min-w-[130px] text-center p-3 border-b border-r">
        <div className="font-semibold text-gray-800">{dayNames[i]}</div>
        <div className="text-sm text-gray-600">{date.toLocaleDateString('vi-VN')}</div>
      </div>
    ));
  };

  // Render lại grid tiết học chỉ dựa vào dữ liệu API
  const renderScheduleGrid = () => {
    const days = getWeekDatesArray();
    return timeSlots.map((slot) => (
      <div key={slot.period} className="flex min-w-full border-b">
        <div className="w-[120px] shrink-0 p-3 text-center border-r bg-gray-50">
          <div className="font-medium text-gray-800">Tiết {slot.period}</div>
          <div className="text-xs text-gray-600">
            {slot.start} - {slot.end}
          </div>
        </div>
        {days.map((date, dayIndex) => {
          // Tìm section đúng ngày và tiết
          const dateStr = date.toISOString().split('T')[0];
          const section = periods.find(
            s => s.periodno === slot.period && s.perioddate.startsWith(dateStr)
          );
          return (
            <div key={dayIndex} className="flex-1 min-w-[130px] p-2 border-r hover:bg-gray-50">
              {section && (
                <div
                  className="h-full p-2 rounded bg-blue-100 text-sm transition-colors hover:bg-blue-200 cursor-pointer"
                  onClick={() => navigate(`/session/${section.periodid}`)}
                >
                  <div className="font-medium text-blue-900 hover:underline">
                    {getClassName(section.classid, section)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {getSubjectName(section.subjectid, section)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="flex-1 p-4 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Lịch giảng dạy</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-sm font-medium">Năm học:</label>
          <select
            value={selectedSchoolYear || ''}
            onChange={e => setSelectedSchoolYear(Number(e.target.value))}
            className="px-2 py-1 border rounded"
          >
            {schoolYears.map(sy => (
              <option key={sy.schoolyearid} value={sy.schoolyearid}>{sy.year}</option>
            ))}
          </select>
          <label className="text-sm font-medium ml-2">Tuần:</label>
          <select
            value={selectedWeek?.start || ''}
            onChange={e => {
              const week = weeks.find(w => w.start === e.target.value);
              setSelectedWeek(week || null);
            }}
            className="px-2 py-1 border rounded"
            disabled={!weeks.length}
          >
            {weeks.map(week => (
              <option key={week.start} value={week.start}>{week.label}</option>
            ))}
          </select>
        </div>
      </div>
      

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải lịch giảng dạy...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <div className="min-w-full">
            <div className="flex min-w-full border-b">
              <div className="w-[120px] shrink-0 p-3 text-center border-r bg-gray-50 font-semibold text-gray-800">
                Tiết
              </div>
              {renderWeekHeader()}
            </div>
            <div className="min-w-full">
              {renderScheduleGrid()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;