import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_URL from '../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SectionDetail = () => {
  const { sectionid } = useParams();
  const [sectionInfo, setSectionInfo] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [teacherName, setTeacherName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [parentAccounts, setParentAccounts] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [evaluationContent, setEvaluationContent] = useState('');
  const [isPositive, setIsPositive] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSectionAndStudents = async () => {
      try {
        setLoading(true);
        // Fetch section info
        const sectionRes = await fetch(`${API_URL}/api/Period/${sectionid}`);
        if (!sectionRes.ok) throw new Error('Không thể tải dữ liệu tiết học');
        const sectionData = await sectionRes.json();
        setSectionInfo(sectionData);

        // Fetch class info
        const classRes = await fetch(`${API_URL}/api/Class`);
        if (!classRes.ok) throw new Error('Không thể tải dữ liệu lớp');
        const classData = await classRes.json();
        const foundClass = classData.find(cls => cls.classid === sectionData.classid);
        setClassInfo(foundClass || null);
        if (!foundClass) {
          setStudents([]);
          setTeacherName('');
          setParentAccounts([]);
          setError(null);
          setLoading(false);
          return;
        }
        // Fetch students
        const studentRes = await fetch(`${API_URL}/api/Student`);
        const studentData = await studentRes.json();
        const filteredStudents = studentData.filter(stu => stu.classid === foundClass.classid);
        setStudents(filteredStudents);
        // Fetch parent accounts
        const parentRes = await fetch(`${API_URL}/api/UserAccount/GetAllUserAccounts`);
        const parentData = await parentRes.json();
        setParentAccounts(parentData);
        // Fetch teacher info
        const teacherRes = await fetch(`${API_URL}/api/Teacher`);
        const teacherData = await teacherRes.json();
        const teacher = teacherData.find(t => t.teacherid === foundClass.teacherhomeroomid);
        let name = '';
        if (teacher && teacher.userid) {
          try {
            const userRes = await fetch(`${API_URL}/api/UserAccount/GetUserAccount/${teacher.userid}`);
            if (userRes.ok) {
              const userData = await userRes.json();
              name = userData.fullname || '';
            }
          } catch (err) {
            name = '';
          }
        }
        if (!name) {
          name = 'Không rõ';
        }
        setTeacherName(name);
        setError(null);
      } catch (err) {
        setError('Không thể tải dữ liệu tiết học hoặc học sinh.');
      } finally {
        setLoading(false);
      }
    };
    if (sectionid) {
      fetchSectionAndStudents();
    }
  }, [sectionid]);

  // Fetch activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch(`${API_URL}/api/Activity`);
        const data = await res.json();
        setActivities(data);
      } catch (err) {
        setActivities([]);
      }
    };
    fetchActivities();
  }, []);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedStudents(students.map(stu => stu.studentid));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId, checked) => {
    if (checked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    }
  };

  const handleSubmitEvaluation = async () => {
    if (selectedStudents.length === 0 || !selectedActivityId) {
      toast.error('Vui lòng chọn học sinh và hoạt động');
      return;
    }
    try {
      setEvaluating(true);
      // Build students array chỉ gồm studentid
      const studentsArr = selectedStudents.map(id => ({ studentid: id }));
      // Lấy activitytype nếu content rỗng
      const activityObj = activities.find(act => act.activityid === Number(selectedActivityId));
      const contentToSend = evaluationContent.trim() !== '' ? evaluationContent : (activityObj ? activityObj.activitytype : '');
      // Lấy thời gian hiện tại theo định dạng 'YYYY-MM-DDTHH:mm:ss'
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      const createdAtStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const evaluationData = {
        periodid: Number(sectionid),
        content: contentToSend,
        activityid: Number(selectedActivityId),
        students: studentsArr,
        createdat: createdAtStr
      };
      const response = await fetch(`${API_URL}/api/Evaluation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evaluationData)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        toast.error('Không thể gửi đánh giá. Vui lòng thử lại sau.');
        return;
      }
      setEvaluationContent('');
      setIsPositive(true);
      setSelectedStudents([]);
      setSelectedActivityId('');
      setShowEvaluationModal(false);
      toast.success('Đánh giá đã được gửi thành công!');
    } catch (err) {
      console.error('Error submitting evaluation:', err);
      toast.error('Có lỗi xảy ra khi gửi đánh giá: ' + err.message);
    } finally {
      setEvaluating(false);
    }
  };

  // Lọc activity phù hợp với loại đánh giá
  const filteredActivities = activities.filter(act => act.isnegative === !isPositive);

  return (
    <div className="flex-1 p-8 w-full">
      <ToastContainer />
      <button
        className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700"
        onClick={() => navigate(-1)}
      >
        ← Quay lại
      </button>
      <div className="bg-white rounded-lg shadow-md p-8 w-full">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải thông tin tiết học...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
        ) : !sectionInfo || !classInfo ? (
          <div className="text-center text-gray-500">Không tìm thấy thông tin tiết học.</div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4">Thông tin tiết học</h2>
            <div className="mb-2"><b>Lớp:</b> {classInfo.classname}</div>
            <div className="mb-2"><b>Tiết:</b> {sectionInfo.periodno}</div>
            <div className="mb-2"><b>Ngày:</b> {new Date(sectionInfo.perioddate).toLocaleDateString('vi-VN')}</div>
            <div className="mb-2"><b>Giáo viên chủ nhiệm:</b> {teacherName}</div>
            <div className="mb-4"><b>Sĩ số:</b> {students.length}</div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Danh sách học sinh</h3>
              {selectedStudents.length > 0 && (
                <button
                  onClick={() => setShowEvaluationModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Đánh giá {selectedStudents.length === students.length 
                    ? "cả lớp" 
                    : `(${selectedStudents.length} học sinh)`}
                </button>
              )}
            </div>
            {students.length === 0 ? (
              <div className="text-gray-500">Không có học sinh nào trong lớp này.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 mb-2">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === students.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và tên</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày sinh</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phụ huynh</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((stu, idx) => {
                    const parent = parentAccounts.find(acc => acc.userid === stu.parentid);
                    return (
                      <tr key={stu.studentid}>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(stu.studentid)}
                            onChange={(e) => handleSelectStudent(stu.studentid, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900"><b>{stu.name}</b></td>
                        <td className="px-4 py-2 text-sm text-gray-900">{new Date(stu.dateofbirth).toLocaleDateString('vi-VN')}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {parent ? (
                            <div>
                              <div><b>{parent.fullname}</b></div>
                              <div>Email: {parent.email || 'Không có'}</div>
                              <div>SDT: {parent.phonenumber || 'Không có'}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Chưa có thông tin</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
      {/* Evaluation Modal */}
      {showEvaluationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Đánh giá {selectedStudents.length} học sinh</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại đánh giá
              </label>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={isPositive}
                    onChange={() => setIsPositive(true)}
                    className="form-radio text-blue-600"
                    disabled={evaluating}
                  />
                  <span className="ml-2">Tích cực</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={!isPositive}
                    onChange={() => setIsPositive(false)}
                    className="form-radio text-blue-600"
                    disabled={evaluating}
                  />
                  <span className="ml-2">Tiêu cực</span>
                </label>
              </div>
            </div>
            {/* Chọn hoạt động */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hoạt động
              </label>
              <select
                value={selectedActivityId}
                onChange={e => setSelectedActivityId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                disabled={evaluating}
              >
                <option value="">-- Chọn hoạt động --</option>
                {filteredActivities.map(act => (
                  <option key={act.activityid} value={act.activityid}>{act.activitytype}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nội dung đánh giá
              </label>
              <textarea
                value={evaluationContent}
                onChange={(e) => setEvaluationContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                rows="4"
                placeholder="Nhập nội dung đánh giá..."
                disabled={evaluating}
              />
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowEvaluationModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                disabled={evaluating}
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitEvaluation}
                disabled={!selectedActivityId || selectedStudents.length === 0 || evaluating}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {evaluating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Đang gửi...
                  </>
                ) : (
                  'Gửi đánh giá'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionDetail; 