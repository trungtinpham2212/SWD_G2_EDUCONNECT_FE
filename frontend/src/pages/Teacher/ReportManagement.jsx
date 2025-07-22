import React, { useEffect, useState } from 'react';
import API_URL from '../../config/api';
import { FaSearch, FaEye, FaCalendarAlt, FaFileAlt, FaPlus, FaUserGraduate } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getAuthHeaders, removeToken } from '../../utils/auth';

const ITEMS_PER_PAGE = 9;

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
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'sent' | 'draft'

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      setError('');
      try {
        const teacherId = user?.teacherId || localStorage.getItem('teacherId');
        let url = `${API_URL}/api/report-groups?teacherId=${teacherId}&page=${currentPage}&pageSize=${ITEMS_PER_PAGE}&sortBy=createdAt&sortOrder=desc`;
        if (statusFilter === 'sent') url += `&status=Sent`;
        if (statusFilter === 'draft') url += `&status=Draft`;
        const res = await fetch(url, {
          headers: { ...getAuthHeaders() }
        });
        if (!res.ok) throw new Error('Không thể tải danh sách báo cáo');
        const data = await res.json();
        // Sort: chưa gửi lên đầu, đã gửi xuống dưới, trong mỗi nhóm sort theo createdAt giảm dần
        const sortedItems = (data.items || []).slice().sort((a, b) => {
          const isSentA = a.status && (a.status.toLowerCase() === 'sent' || a.status.toLowerCase() === 'hoàn thành');
          const isSentB = b.status && (b.status.toLowerCase() === 'sent' || b.status.toLowerCase() === 'hoàn thành');
          if (isSentA !== isSentB) return isSentA ? 1 : -1; // chưa gửi lên đầu
          // Nếu cùng nhóm, sort theo createdAt giảm dần
          const dateA = new Date(a.createdat || a.createdAt || 0).getTime();
          const dateB = new Date(b.createdat || b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        setReportGroups(sortedItems);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
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
        // Lấy tất cả lớp
        const classRes = await fetch(`${API_URL}/api/classes?page=1&pageSize=100`, {
          headers: { ...getAuthHeaders() }
        });
        const classDataRaw = await classRes.json();
        const classData = Array.isArray(classDataRaw.items) ? classDataRaw.items : classDataRaw;
        const foundClass = classData.find(cls => cls.teacherhomeroomid === user.teacherId);
        setHomeroomClass(foundClass || null);
        if (foundClass) {
          // SỬA: dùng endpoint mới
          const studentRes = await fetch(`${API_URL}/api/students?classId=${foundClass.classid}`, {
            headers: { ...getAuthHeaders() }
          });
          const studentDataRaw = await studentRes.json();
          // Đáp ứng chuẩn swagger: trả về { items: [...] }
          const studentData = Array.isArray(studentDataRaw.items) ? studentDataRaw.items : studentDataRaw;
          setStudents(Array.isArray(studentData) ? studentData : []);
        } else {
          setStudents([]);
        }
      } catch {
        setStudents([]);
      }
    };
    fetchHomeroom();
  }, [user, currentPage, statusFilter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN');
  };

  const getStatusDisplay = (status) => {
    if (!status) return 'Đang tạo...';
    if (status.toLowerCase() === 'hoàn thành' || status.toLowerCase() === 'sent') return 'Đã gửi';
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
        startDate: startDate,
        endDate: endDate
      };
      const res = await fetch(`${API_URL}/api/report-groups/ai-generate-group-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Tạo báo cáo thất bại');
      setShowModal(false);
      setSelectedStudents([]);
      setStartDate(dayjs().format('YYYY-MM-DD'));
      setEndDate(dayjs().format('YYYY-MM-DD'));
      // Reload group list
      const teacherId = user?.teacherId || localStorage.getItem('teacherId');
      // SỬA: dùng endpoint mới, thêm sortBy và sortOrder để mới nhất lên đầu
      const reload = await fetch(`${API_URL}/api/report-groups?teacherId=${teacherId}&page=1&pageSize=10&sortBy=createdAt&sortOrder=desc`, {
        headers: { ...getAuthHeaders() }
      });
      const reloadData = await reload.json();
      // Sort lại chỉ theo createdAt khi reload
      const sortedReload = (reloadData.items || []).slice().sort((a, b) => {
        const dateA = new Date(a.createdat || a.createdAt || 0).getTime();
        const dateB = new Date(b.createdat || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setReportGroups(sortedReload);
      setTotalCount(reloadData.totalCount || 0);
      setTotalPages(reloadData.totalPages || 1);
    } catch (e) {
      alert(e.message || 'Tạo báo cáo thất bại');
    } finally {
      setCreating(false);
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
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
        {/* Dropdown lọc trạng thái */}
        <select
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value);
            setCurrentPage(1); // reset về trang 1 khi đổi filter
          }}
        >
          <option value="all">Tất cả</option>
          <option value="sent">Đã gửi</option>
          <option value="draft">Nháp</option>
        </select>
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
              <div className="mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={students.length > 0 && selectedStudents.length === students.length}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedStudents(students.map(s => s.studentid));
                      } else {
                        setSelectedStudents([]);
                      }
                    }}
                  />
                  <span>Chọn tất cả</span>
                </label>
              </div>
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportGroups
              .filter(g => g.title.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((group, idx) => (
                <div key={group.reportgroupid} className="bg-white rounded-lg shadow-md p-5 flex flex-col gap-2 border hover:shadow-lg transition h-full">
                  <div className="flex items-center gap-2 mb-2 min-h-[40px]">
                    <FaFileAlt className="text-blue-400" />
                    <span className="font-semibold text-lg truncate block w-full" title={group.title} dangerouslySetInnerHTML={{__html: boldMarkdown(group.title)}}></span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm min-h-[28px]">
                    <FaCalendarAlt /> {formatDate(group.startdate)} - {formatDate(group.enddate)}
                  </div>
                  <div className="flex items-center gap-2 text-sm min-h-[32px]">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${['Hoàn thành', 'Sent', 'sent'].includes(group.status) ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{getStatusDisplay(group.status)}</span>
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
          <div className="flex items-center gap-2 mt-6">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 bg-gray-200 text-gray-500 rounded-md">&lt;</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => handlePageChange(i + 1)}
                className={`px-3 py-1 ${currentPage === i + 1 ? 'bg-blue-500 text-white' : 'text-gray-500'} rounded-md`}
              >
                {i + 1}
              </button>
            ))}
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-200 text-gray-500 rounded-md">&gt;</button>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportManagement;
