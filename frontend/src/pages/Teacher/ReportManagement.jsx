import React, { useEffect, useState } from 'react';
import API_URL from '../../config/api';
import { FaSearch, FaEye, FaCalendarAlt, FaFileAlt, FaPlus, FaUserGraduate } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const ReportManagement = ({ user }) => {
  const [reportGroups, setReportGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [homeroomClass, setHomeroomClass] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      setError('');
      try {
        const teacherId = user?.teacherId || localStorage.getItem('teacherId');
        const res = await fetch(`${API_URL}/api/report-groups/teacher/${teacherId}?page=1&pageSize=10`);
        if (!res.ok) throw new Error('Không thể tải danh sách báo cáo');
        const data = await res.json();
        setReportGroups(data);
      } catch (err) {
        setError(err.message || 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();

    // Lấy danh sách học sinh lớp chủ nhiệm
    const fetchHomeroom = async () => {
      try {
        const classRes = await fetch(`${API_URL}/api/classes?page=1&pageSize=10`);
        const classData = await classRes.json();
        const foundClass = classData.find(cls => cls.teacherhomeroomid === user.teacherId);
        setHomeroomClass(foundClass || null);
        if (foundClass) {
          const studentRes = await fetch(`${API_URL}/api/students?page=1&pageSize=10`);
          const studentData = await studentRes.json();
          const filtered = studentData.filter(s => s.classid === foundClass.classid);
          setStudents(filtered);
        } else {
          setStudents([]);
        }
      } catch {}
    };
    fetchHomeroom();
  }, [user]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN');
  };

  const getStatusDisplay = (status) => {
    if (!status) return 'Đang tạo...';
    if (status.toLowerCase() === 'hoàn thành') return 'Đã gửi';
    if (status.toLowerCase() === 'draft') return 'Nháp';
    return status;
  };

  // Hàm chuyển **text** thành <strong>text</strong>
  function boldMarkdown(text) {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  const openCreateModal = () => {
    setSelectedStudents(students.map(s => s.studentid));
    setStartDate(dayjs().format('YYYY-MM-DD'));
    setEndDate(dayjs().format('YYYY-MM-DD'));
    setShowModal(true);
  };

  const handleStudentToggle = (id) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const handleCreateReport = async () => {
    setCreating(true);
    try {
      const body = {
        teacherId: user.teacherId,
        studentIds: selectedStudents,
        startDate: dayjs(startDate).toISOString(),
        endDate: dayjs(endDate).toISOString(),
      };
      const res = await fetch(`${API_URL}/api/report-groups/ai-generate-group-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Tạo báo cáo thất bại');
      setShowModal(false);
      setSelectedStudents([]);
      setStartDate(dayjs().format('YYYY-MM-DD'));
      setEndDate(dayjs().format('YYYY-MM-DD'));
      // Reload group list
      const teacherId = user?.teacherId || localStorage.getItem('teacherId');
      const reload = await fetch(`${API_URL}/api/report-groups/teacher/${teacherId}?page=1&pageSize=10`);
      setReportGroups(await reload.json());
    } catch (e) {
      alert(e.message || 'Tạo báo cáo thất bại');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <FaFileAlt className="text-blue-500" /> Báo cáo AI lớp chủ nhiệm
      </h2>
      <div className="mb-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm báo cáo theo tiêu đề..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={openCreateModal}
        >
          <FaPlus /> Tạo báo cáo
        </button>
      </div>
      {/* Modal tạo báo cáo */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={()=>setShowModal(false)}>&times;</button>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FaFileAlt /> Tạo báo cáo mới</h3>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Chọn học sinh</label>
              <div className="max-h-40 overflow-y-auto border rounded p-2">
                {students.map(stu => (
                  <label key={stu.studentid} className="flex items-center gap-2 mb-1 cursor-pointer">
                    <input type="checkbox" checked={selectedStudents.includes(stu.studentid)} onChange={()=>handleStudentToggle(stu.studentid)} />
                    <FaUserGraduate className="text-blue-500" />
                    <span>{stu.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-3 flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Từ ngày</label>
                <input type="date" className="border rounded px-2 py-1 w-full" value={startDate} onChange={e=>setStartDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Đến ngày</label>
                <input type="date" className="border rounded px-2 py-1 w-full" value={endDate} onChange={e=>setEndDate(e.target.value)} />
              </div>
            </div>
            <button
              className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mt-2 disabled:opacity-60"
              onClick={handleCreateReport}
              disabled={creating || selectedStudents.length === 0}
            >
              {creating ? 'Đang tạo...' : 'Tạo báo cáo'}
            </button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <span className="animate-spin text-3xl text-blue-500 mr-2">⏳</span> Đang tải báo cáo...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportGroups
            .filter(g => g.title.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(group => (
              <div key={group.reportgroupid} className="bg-white rounded-lg shadow-md p-5 flex flex-col gap-2 border hover:shadow-lg transition h-full">
                <div className="flex items-center gap-2 mb-2 min-h-[40px]">
                  <FaFileAlt className="text-blue-400" />
                  <span className="font-semibold text-lg truncate block w-full" title={group.title} dangerouslySetInnerHTML={{__html: boldMarkdown(group.title)}}></span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm min-h-[28px]">
                  <FaCalendarAlt /> {formatDate(group.startdate)} - {formatDate(group.enddate)}
                </div>
                <div className="flex items-center gap-2 text-sm min-h-[32px]">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${group.status === 'Hoàn thành' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{getStatusDisplay(group.status)}</span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1 justify-center"
                    onClick={() => navigate(`/teacher/reports/${group.reportgroupid}`)}
                  >
                    <FaEye /> Xem chi tiết
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
      <div className="mb-4 text-gray-700 whitespace-pre-line max-h-72 overflow-auto border rounded p-4 bg-gray-50" dangerouslySetInnerHTML={{__html: boldMarkdown(selectedGroup?.content)}}></div>
    </div>
  );
};

export default ReportManagement;
