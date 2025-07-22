import React, { useEffect, useState } from 'react';
import API_URL from '../../config/api';
import { getTokenFromStorage, getAuthHeaders } from '../../utils/auth';

const ITEMS_PER_PAGE = 20;

const LOG_TYPE_MAP = {
  1: 'Đăng nhập',
  2: 'Cập nhật thông tin cá nhân',
  3: 'Khoá tài khoản',
  4: 'Đăng ký tài khoản',
  5: 'Mở khoá tài khoản',
  6: 'Xóa tài khoản',
  7: 'Tạo báo cáo',
  8: 'Cập nhật báo cáo',
  9: 'Xóa báo cáo',
  10: 'Xem báo cáo',
  11: 'Tạo đánh giá',
  12: 'Cập nhật đánh giá',
  13: 'Xóa đánh giá',
  14: 'Xem đánh giá',
  15: 'Gửi tin nhắn',
  16: 'Xóa tin nhắn',
  17: 'Xem cuộc trò chuyện',
};

const ActivityLog = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [allLogs, setAllLogs] = useState([]);
  const [isFetchingAll, setIsFetchingAll] = useState(false);



  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!filterType) {
          // Không filter, phân trang backend
          const [logRes, userRes] = await Promise.all([
            fetch(`${API_URL}/api/log-activities?page=${currentPage}&pageSize=${ITEMS_PER_PAGE}`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/api/user-accounts`, { headers: getAuthHeaders() })
          ]);
          const logDataRaw = await logRes.json();
          const userData = await userRes.json();
          const logData = Array.isArray(logDataRaw.items) ? logDataRaw.items : [];
          setLogs(logData);
          setUsers(userData);
          setTotalCount(logDataRaw.totalCount || logData.length);
          setTotalPages(logDataRaw.totalPages || 1);
          setAllLogs([]); // reset allLogs khi bỏ filter
        } else {
          // Có filter, lấy toàn bộ log rồi lọc trên client
          setIsFetchingAll(true);
          // Lấy tổng số trang
          const firstRes = await fetch(`${API_URL}/api/log-activities?page=1&pageSize=${ITEMS_PER_PAGE}`, { headers: getAuthHeaders() });
          const firstData = await firstRes.json();
          const userRes = await fetch(`${API_URL}/api/user-accounts`, { headers: getAuthHeaders() });
          const userData = await userRes.json();
          const totalPages = firstData.totalPages || 1;
          let all = Array.isArray(firstData.items) ? firstData.items : [];
          // Lấy các trang còn lại
          const fetches = [];
          for (let i = 2; i <= totalPages; i++) {
            fetches.push(fetch(`${API_URL}/api/log-activities?page=${i}&pageSize=${ITEMS_PER_PAGE}`, { headers: getAuthHeaders() }));
          }
          const results = await Promise.all(fetches);
          for (const res of results) {
            const data = await res.json();
            if (Array.isArray(data.items)) all = all.concat(data.items);
          }
          setUsers(userData);
          setAllLogs(all);
          setIsFetchingAll(false);
        }
      } catch (err) {
        setError('Không thể tải dữ liệu lịch sử hoạt động. Vui lòng thử lại sau.');
        setIsFetchingAll(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentPage, filterType]);

  // Khi filter, phân trang client trên allLogs đã lọc
  const filteredLogs = filterType
    ? allLogs.filter(log => String(log.logactivitytype) === String(filterType))
    : logs;
  const totalFiltered = filteredLogs.length;
  const totalFilteredPages = Math.max(1, Math.ceil(totalFiltered / ITEMS_PER_PAGE));
  const paginatedLogs = filterType
    ? filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    : logs;

  // Khi đổi filter, reset về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType]);

  const getUserName = (log) => {
    // Ưu tiên lấy fullname từ users API
    if (log.userid && Array.isArray(users)) {
      const user = users.find(u => u.userid === log.userid);
      if (user && user.fullname) return user.fullname;
    }
    if (log.user && typeof log.user === 'object' && log.user.fullname) return log.user.fullname;
    if (typeof log.user === 'string') return log.user;
    return `User ${log.userid}`;
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= (filterType ? totalFilteredPages : totalPages)) setCurrentPage(page);
  };

  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Lịch sử hoạt động</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <label className="text-sm font-medium text-gray-700">Lọc theo loại hoạt động:</label>
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả</option>
            {Object.entries(LOG_TYPE_MAP).map(([key, val]) => (
              <option key={key} value={key}>{val}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải lịch sử hoạt động...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người dùng</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại hoạt động</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-4 text-center text-gray-500">{isFetchingAll ? 'Đang tải toàn bộ dữ liệu...' : 'Không có dữ liệu'}</td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log, idx) => (
                      <tr key={log.logactivityid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{getUserName(log)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{LOG_TYPE_MAP[log.logactivitytype] || log.logactivitytype}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs whitespace-pre-line break-words">{log.note}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{log.createat ? new Date(log.createat).toLocaleString('vi-VN') : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex justify-center items-center mt-6 gap-2">
              <button
                className="px-3 py-1 rounded border bg-gray-100 hover:bg-gray-200"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                &lt;
              </button>
              {Array.from({ length: filterType ? totalFilteredPages : totalPages }, (_, i) => (
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
                disabled={currentPage === (filterType ? totalFilteredPages : totalPages)}
              >
                &gt;
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;