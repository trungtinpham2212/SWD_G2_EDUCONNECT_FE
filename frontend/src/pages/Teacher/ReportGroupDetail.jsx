import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_URL from '../../config/api';
import { FaArrowLeft, FaCalendarAlt, FaFileAlt } from 'react-icons/fa';

const ReportGroupDetail = ({ user }) => {
  const { reportGroupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentReports, setStudentReports] = useState([]);

  useEffect(() => {
    const fetchGroupDetail = async () => {
      setLoading(true);
      setError('');
      try {
        // Lấy danh sách report student trong group này
        const res = await fetch(`${API_URL}/api/report-students/report-group/${reportGroupId}`);
        if (!res.ok) throw new Error('Không tìm thấy báo cáo');
        const data = await res.json();
        if (data.length > 0) {
          setGroup(data[0].reportgroup || null);
          setStudentReports(data);
        } else {
          setGroup(null);
          setStudentReports([]);
        }
      } catch (err) {
        setError(err.message || 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    };
    if (reportGroupId) fetchGroupDetail();
  }, [reportGroupId]);

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <span className="animate-spin text-3xl text-blue-500 mr-2">⏳</span> Đang tải báo cáo...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaFileAlt className="text-2xl text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Lỗi</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <button 
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl" 
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft /> Quay lại
          </button>
        </div>
      </div>
    );
  }
  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-yellow-600 text-lg">Không có dữ liệu báo cáo nhóm này.</div>
      </div>
    );
  }
  return (
    <div className="flex-1 p-6 w-full">
      <button className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-2" onClick={() => navigate(-1)}><FaArrowLeft /> Quay lại</button>
      <div className="bg-white rounded-lg shadow-lg p-6 w-full">
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2"><FaFileAlt className="text-blue-500" /> <span dangerouslySetInnerHTML={{__html: boldMarkdown(group.title)}}></span></h2>
        <div className="mb-2 text-gray-600 flex items-center gap-2"><FaCalendarAlt /> {formatDate(group.startdate)} - {formatDate(group.enddate)}</div>
        <div className="mb-4 text-gray-700 whitespace-pre-line border rounded p-4 bg-gray-50" dangerouslySetInnerHTML={{__html: boldMarkdown(group.content)}}></div>
        <div className="mb-4">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold 
            ${group.status && group.status.toLowerCase() === 'hoàn thành' ? 'bg-green-100 text-green-700 border border-green-300' : ''}
            ${group.status && group.status.toLowerCase() === 'draft' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : ''}
          `}>{getStatusDisplay(group.status)}</span>
        </div>
        <h3 className="font-semibold mb-2 text-lg">Báo cáo từng học sinh</h3>
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Học sinh</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nội dung</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {studentReports.map((r, idx) => (
                <tr key={r.reportstudentid}>
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2">{r.student?.name || r.studentid}</td>
                  <td className="px-4 py-2 text-sm whitespace-pre-line max-w-2xl break-words" dangerouslySetInnerHTML={{__html: boldMarkdown(r.content)}}></td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                      ${r.status && r.status.toLowerCase() === 'hoàn thành' ? 'bg-green-100 text-green-700 border border-green-300' : ''}
                      ${r.status && r.status.toLowerCase() === 'draft' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : ''}
                    `}>{getStatusDisplay(r.status)}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">{formatDate(r.updateat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportGroupDetail;
