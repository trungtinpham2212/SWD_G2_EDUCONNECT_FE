import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import API_URL from '../../config/api';
import { useNavigate } from 'react-router-dom';

const Schedule = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date('2024-12-02'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  // Get start and end of the week (Monday to Sunday)
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

  // Format date to YYYY-MM-DD (local, not UTC)
  const formatDate = (date) => {
    // Lấy đúng ngày local, không bị lệch múi giờ
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch subjects and classes
  useEffect(() => {
    const fetchSubjectsAndClasses = async () => {
      try {
        const [subjectRes, classRes] = await Promise.all([
          fetch(`${API_URL}/api/subjects`),
          fetch(`${API_URL}/api/classes`)
        ]);
        setSubjects(await subjectRes.json());
        setClasses(await classRes.json());
      } catch (err) {}
    };
    fetchSubjectsAndClasses();
  }, []);

  // Fetch sections
  useEffect(() => {
    const fetchSections = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/periods`);
        if (!response.ok) {
          throw new Error('Failed to fetch schedule data');
        }
        const data = await response.json();
        // Filter sections for the current week and teacher
        const { start, end } = getWeekDates(currentWeek);
        const startStr = formatDate(start);
        const endStr = formatDate(end);
        const filteredSections = data.filter(section => {
          // Lấy phần ngày từ perioddate (YYYY-MM-DD)
          const sectionDateStr = section.perioddate.split('T')[0];
          // So sánh chuỗi ngày thay vì đối tượng Date để tránh lệch múi giờ
          const isInWeek = sectionDateStr >= startStr && sectionDateStr <= endStr;
          const isTeacherMatch = Number(section.teacherid) === Number(user?.teacherId);
          return isInWeek && isTeacherMatch;
        });
        setSections(filteredSections);
        setError(null);
      } catch (err) {
        setError('Không thể tải lịch giảng dạy. Vui lòng thử lại sau.');
        console.error('Error fetching sections:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.teacherId) {
      fetchSections();
    }
  }, [currentWeek, user?.teacherId]);

  const navigateWeek = (direction) => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const getDayName = (date) => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[date.getDay()];
  };

  const formatDateVN = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  // Helper lấy tên môn học và tên lớp
  const getSubjectName = (subjectid) => {
    const subject = subjects.find(s => s.subjectid === subjectid);
    return subject ? subject.subjectname : `Môn ${subjectid}`;
  };
  const getClassName = (classid) => {
    const cls = classes.find(c => c.classid === classid);
    return cls ? cls.classname : `Lớp ${classid}`;
  };

  const handleClassClick = (periodid) => {
    navigate(`/session/${periodid}`);
  };

  const renderWeekHeader = () => {
    const { start } = getWeekDates(currentWeek);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(
        <div key={i} className="flex-1 min-w-[130px] text-center p-3 border-b border-r">
          <div className="font-semibold text-gray-800">{getDayName(date)}</div>
          <div className="text-sm text-gray-600">{formatDateVN(date)}</div>
        </div>
      );
    }
    return days;
  };

  const renderScheduleGrid = () => {
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
          const cellDateStr = formatDate(date); // YYYY-MM-DD
          // Find section for this time slot and day
          const section = sections.find(section => {
            const sectionDateStr = section.perioddate.split('T')[0];
            return sectionDateStr === cellDateStr && Number(section.periodno) === Number(slot.period);
          });
          return (
            <div key={dayIndex} className="flex-1 min-w-[130px] p-2 border-r hover:bg-gray-50">
              {section && (
                <div className="h-full p-2 rounded bg-blue-100 text-sm transition-colors hover:bg-blue-200">
                  <div className="font-medium text-blue-900 cursor-pointer hover:underline" onClick={() => handleClassClick(section.periodid)}>
                    {getClassName(section.classid)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {getSubjectName(section.subjectid)}
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Lịch giảng dạy</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaChevronLeft className="text-gray-600" />
          </button>
          <div className="flex items-center bg-white px-4 py-2 rounded-lg shadow-sm">
            <FaCalendarAlt className="mr-2 text-blue-600" />
            <span className="font-medium">
              {formatDateVN(getWeekDates(currentWeek).start)} - {formatDateVN(getWeekDates(currentWeek).end)}
            </span>
          </div>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaChevronRight className="text-gray-600" />
          </button>
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