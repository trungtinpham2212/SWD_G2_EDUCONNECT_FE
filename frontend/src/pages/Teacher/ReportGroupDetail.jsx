import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_URL from '../../config/api';
import { FaArrowLeft, FaCalendarAlt, FaFileAlt } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getTokenFromStorage, getAuthHeaders } from '../../utils/auth';

const ITEMS_PER_PAGE = 15;



const BackIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ReportGroupDetail = ({ user }) => {
  const { reportGroupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentReports, setStudentReports] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editReportStudents, setEditReportStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [originalReportStudents, setOriginalReportStudents] = useState([]);

  const fetchGroupDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/report-students/report-group/${reportGroupId}?page=${currentPage}&pageSize=${ITEMS_PER_PAGE}`, {
        headers: { ...getAuthHeaders() }
      });
      if (!res.ok) throw new Error('Không tìm thấy báo cáo');
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setGroup(data.items[0].reportgroup || null);
        setStudentReports(data.items);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
        setEditTitle(data.items[0].reportgroup?.title || '');
        setEditContent(data.items[0].reportgroup?.content || '');
        const reportStudentsArr = data.items.map(item => ({
          reportStudentId: item.reportstudentid,
          studentId: item.student?.studentid || item.studentid,
          content: item.content
        }));
        setEditReportStudents(reportStudentsArr);
        // Lưu giá trị gốc để so sánh thay đổi
        setOriginalTitle(data.items[0].reportgroup?.title || '');
        setOriginalContent(data.items[0].reportgroup?.content || '');
        setOriginalReportStudents(reportStudentsArr);
      } else {
        setGroup(null);
        setStudentReports([]);
        setTotalCount(0);
        setTotalPages(1);
        setEditTitle('');
        setEditContent('');
        setEditReportStudents([]);
        setOriginalTitle('');
        setOriginalContent('');
        setOriginalReportStudents([]);
      }
    } catch (err) {
      setError(err.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportGroupId) fetchGroupDetail();
  }, [reportGroupId, currentPage]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `.student-tag { background: #2563eb; color: white; border-radius: 6px; padding: 0 6px; margin: 0 2px; font-weight: 600; font-size: 0.95em; display: inline-block; }`;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  function getContentEditableText(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

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

  // Hàm chuyển text sang HTML với tag cho tên học sinh
  function wrapStudentTags(text, studentNames) {
    if (!text) return '';
    let replaced = text;
    studentNames.forEach(name => {
      // Regex: match tên học sinh ở đầu dòng, sau *, trong HTML, ...
      const regex = new RegExp(`(\\b|^|[\\s\\*\\n\\r\\t>])(${name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')})(?=$|\\b|[\\s\\*\\n\\r\\t<])`, 'g');
      replaced = replaced.replace(regex, `$1<span class='student-tag' contenteditable='false'>@$2</span>`);
    });
    return replaced;
  }

  // CSS cho tag
  const tagClass = {
    background: '#2563eb',
    color: 'white',
    borderRadius: '6px',
    padding: '0 6px',
    margin: '0 2px',
    fontWeight: 600,
    fontSize: '0.95em',
    display: 'inline-block',
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleSave = async (sendEmail = false) => {
    setSaving(true);
    try {
      const body = {
        reportGroupId: group.reportgroupid,
        teacherId: group.teacherid,
        title: editTitle,
        content: editContent,
        reportStudents: editReportStudents.map(rs => ({
          reportStudentId: rs.reportStudentId,
          studentId: rs.studentId,
          content: rs.content
        }))
      };
      const url = sendEmail
        ? `${API_URL}/api/report-groups/${group.reportgroupid}/send-mail-with-students`
        : `${API_URL}/api/report-groups/${group.reportgroupid}/update-with-students`;
      const method = sendEmail ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(sendEmail ? 'Gửi báo cáo thất bại' : 'Lưu báo cáo thất bại');
      // Cập nhật lại giá trị gốc để disable nút lưu
      setOriginalTitle(editTitle);
      setOriginalContent(editContent);
      setOriginalReportStudents(editReportStudents.map(rs => ({ ...rs })));
      // Hiển thị toast thành công TRƯỚC khi reload data
      toast.success(sendEmail ? 'Đã gửi báo cáo cho phụ huynh!' : 'Đã lưu nháp báo cáo!');
      setIsEditing(false);
      // Reload lại dữ liệu báo cáo để cập nhật trạng thái
      if (reportGroupId) await fetchGroupDetail();
    } catch (e) {
      toast.error(e.message || 'Lỗi khi lưu/gửi báo cáo');
    } finally {
      setSaving(false);
    }
  };

  // So sánh thay đổi
  const isChanged = () => {
    if (editTitle !== originalTitle) return true;
    if (editContent !== originalContent) return true;
    if (editReportStudents.length !== originalReportStudents.length) return true;
    for (let i = 0; i < editReportStudents.length; i++) {
      if (editReportStudents[i].content !== (originalReportStudents[i]?.content || '')) return true;
    }
    return false;
  };

  // Hàm markdown + tag học sinh cho vùng nhập (edit mode)
  function renderContentWithTagsAndMarkdown(text, studentNames) {
    // Đầu tiên markdown, sau đó tag
    const html = boldMarkdown(text);
    return wrapStudentTags(html, studentNames);
  }

  // Lấy danh sách tất cả tên học sinh trong nhóm
  const allStudentNames = studentReports.map(r => r.student?.name).filter(Boolean);
  console.log('Danh sách tên học sinh:', allStudentNames);

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
      <div className="flex-1 p-6 w-full">
        <div className="mb-6">
          <button
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft /> Quay lại
          </button>
        </div>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-yellow-600 text-lg">Không có dữ liệu báo cáo nhóm này.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 p-6 w-full">
      <div className="mb-6">
        <button
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          onClick={() => navigate(-1)}
        >
          <BackIcon />
          Quay lại
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-lg p-6 w-full">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-semibold flex items-center">
            <FaFileAlt className="text-blue-500 mr-2" />
            {isEditing ? (
              <input
                className="border rounded p-3 font-bold text-2xl w-full mb-2"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{ minHeight: '48px' }}
              />
            ) : (
              <span dangerouslySetInnerHTML={{__html: boldMarkdown(group.title)}}></span>
            )}
          </h2>
          {!isEditing && (
            <button className="ml-2 text-gray-500 hover:text-blue-600" onClick={() => setIsEditing(true)} title="Sửa báo cáo">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z" /></svg>
            </button>
          )}
        </div>
        <div className="mb-2 text-gray-600 flex items-center gap-2"><FaCalendarAlt /> {formatDate(group.startdate)} - {formatDate(group.enddate)}</div>
        <div className="mb-4">
          {isEditing ? (
            <div
              className="w-full border rounded p-4 font-medium text-lg mb-4"
              contentEditable
              suppressContentEditableWarning
              onInput={e => setEditContent(getContentEditableText(e.currentTarget.innerHTML))}
              onKeyDown={e => {
                // Xử lý xóa tag khi nhấn Backspace
                const sel = window.getSelection();
                if (e.key === 'Backspace' && sel && sel.anchorNode && sel.anchorNode.nodeType === 3) {
                  const node = sel.anchorNode;
                  const offset = sel.anchorOffset;
                  if (offset === 0 && node.previousSibling && node.previousSibling.classList && node.previousSibling.classList.contains('student-tag')) {
                    e.preventDefault();
                    node.previousSibling.remove();
                  }
                }
              }}
              dangerouslySetInnerHTML={{ __html: renderContentWithTagsAndMarkdown(editContent, allStudentNames) }}
              style={{ minHeight: '180px', maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap', width: '100%' }}
            />
          ) : (
            <div className="text-gray-700 whitespace-pre-line border rounded p-4 bg-gray-50" style={{maxHeight:'none',overflow:'visible'}} dangerouslySetInnerHTML={{__html: wrapStudentTags(boldMarkdown(group.content), allStudentNames)}}></div>
          )}
        </div>
        <div className="mb-4">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold 
            ${group.status && (group.status.toLowerCase() === 'hoàn thành' || group.status.toLowerCase() === 'sent') ? 'bg-green-100 text-green-700 border border-green-300' : ''}
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
                  <td className="px-4 py-2">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td className="px-4 py-2">{r.student?.name || r.studentid}</td>
                  <td className="px-4 py-2 text-sm whitespace-pre-line max-w-2xl break-words">
                    {isEditing ? (
                      <div
                        className="w-full border rounded p-3 font-medium text-base"
                        contentEditable
                        suppressContentEditableWarning
                        onInput={e => {
                          const newContent = getContentEditableText(e.currentTarget.innerHTML);
                          const newArr = editReportStudents.map((item, i) =>
                            i === idx ? { ...item, content: newContent } : { ...item }
                          );
                          setEditReportStudents(newArr);
                        }}
                        onKeyDown={e => {
                          const sel = window.getSelection();
                          if (e.key === 'Backspace' && sel && sel.anchorNode && sel.anchorNode.nodeType === 3) {
                            const node = sel.anchorNode;
                            const offset = sel.anchorOffset;
                            if (offset === 0 && node.previousSibling && node.previousSibling.classList && node.previousSibling.classList.contains('student-tag')) {
                              e.preventDefault();
                              node.previousSibling.remove();
                            }
                          }
                        }}
                        dangerouslySetInnerHTML={{ __html: renderContentWithTagsAndMarkdown(editReportStudents[idx]?.content || '', allStudentNames) }}
                        style={{ minHeight: '120px', maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap', width: '100%' }}
                      />
                    ) : (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: wrapStudentTags(boldMarkdown(r.content), allStudentNames)
                        }}
                        style={{maxHeight:'none',overflow:'visible'}}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                      ${r.status && (r.status.toLowerCase() === 'hoàn thành' || r.status.toLowerCase() === 'sent') ? 'bg-green-100 text-green-700 border border-green-300' : ''}
                      ${r.status && r.status.toLowerCase() === 'draft' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : ''}
                    `}>
                      {getStatusDisplay(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">{formatDate(r.updateat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 mt-4">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-200 rounded" disabled={saving}>Hủy</button>
              <button
                onClick={() => handleSave(false)}
                disabled={!isChanged() || saving}
                className={`px-4 py-2 bg-gray-300 rounded ${(!isChanged() || saving) ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {saving ? 'Đang tải...' : 'Lưu nháp'}
              </button>
              {group.status && ['hoàn thành', 'sent'].includes(group.status.toLowerCase()) ? null : (
                <button
                  onClick={() => handleSave(true)}
                  disabled={!isChanged() || saving}
                  className={`px-4 py-2 bg-blue-600 text-white rounded ${(!isChanged() || saving) ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {saving ? 'Đang tải...' : 'Gửi phụ huynh'}
                </button>
              )}
            </>
          ) : (
            group.status && ['hoàn thành', 'sent'].includes(group.status.toLowerCase()) ? null : (
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className={`px-4 py-2 bg-blue-600 text-white rounded ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {saving ? 'Đang tải...' : 'Gửi phụ huynh'}
              </button>
            )
          )}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default ReportGroupDetail;
