import React, { useEffect, useState } from 'react';
import API_URL from '../config/api';

const ITEMS_PER_PAGE = 20;

const LOG_TYPE_MAP = {
  1: 'Đăng nhập',
  2: 'Tạo mới',
  3: 'Cập nhật',
  4: 'Xóa',
  5: 'Đăng xuất',
};

const ActivityLog = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [logRes, userRes] = await Promise.all([
          fetch(`${API_URL}/api/LogActivity`),
          fetch(`${API_URL}/api/UserAccount/GetAllUserAccounts`)
        ]);
        const logData = await logRes.json();
        const userData = await userRes.json();
        setLogs(logData);
        setUsers(userData);
        setError(null);
      } catch (err) {
        setError('Không thể tải dữ liệu lịch sử hoạt động. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getUserName = (userid) => {
    const u = users.find(user => user.userid === userid);
    return u ? u.fullname : `User ${userid}`;
  };

  const filteredLogs = filterType
    ? logs.filter(log => String(log.logactivitytype) === String(filterType))
    : logs;

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
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
                      <td colSpan="5" className="px-4 py-4 text-center text-gray-500">Không có dữ liệu</td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log, idx) => (
                      <tr key={log.logactivityid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{getUserName(log.userid)}</td>
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
              {Array.from({ length: totalPages }, (_, i) => (
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
                disabled={currentPage === totalPages}
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