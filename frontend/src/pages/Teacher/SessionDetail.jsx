import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_URL from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Helper Components for UI ---

const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
    <div className="bg-blue-100 text-blue-600 p-3 rounded-full flex items-center justify-center">
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-bold text-gray-800 text-base">{value}</p>
    </div>
  </div>
);

// --- SVG Icons ---

const BackIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ClassIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m-1 4h1m6-4h1m-1 4h1m0-8h1m-1 4h1m-1 4h1m-1-4h1" />
  </svg>
);

const PeriodIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CalendarIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const TeacherIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const StudentsIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.122-1.28-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.122-1.28.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const SessionDetail = () => {
  const { sessionid } = useParams();
  const [sessionInfo, setSessionInfo] = useState(null);
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
    const fetchSessionAndStudents = async () => {
      try {
        setLoading(true);
        const sessionRes = await fetch(`${API_URL}/api/Period/${sessionid}`);
        if (!sessionRes.ok) throw new Error('Không thể tải dữ liệu buổi học');
        const sessionData = await sessionRes.json();
        setSessionInfo(sessionData);

        const classRes = await fetch(`${API_URL}/api/Class`);
        if (!classRes.ok) throw new Error('Không thể tải dữ liệu lớp');
        const classData = await classRes.json();
        const foundClass = classData.find(cls => cls.classid === sessionData.classid);
        setClassInfo(foundClass || null);
        if (!foundClass) {
          setError('Không tìm thấy thông tin lớp học.');
          setLoading(false);
          return;
        }

        const studentRes = await fetch(`${API_URL}/api/Student`);
        const studentData = await studentRes.json();
        const filteredStudents = studentData.filter(stu => stu.classid === foundClass.classid);
        setStudents(filteredStudents);

        const parentRes = await fetch(`${API_URL}/api/UserAccount/GetAllUserAccounts`);
        const parentData = await parentRes.json();
        setParentAccounts(parentData);

        const teacherRes = await fetch(`${API_URL}/api/Teacher`);
        const teacherData = await teacherRes.json();
        const teacher = teacherData.find(t => t.teacherid === foundClass.teacherhomeroomid);
        let name = 'Không rõ';
        if (teacher?.userid) {
          const userRes = await fetch(`${API_URL}/api/UserAccount/GetUserAccount/${teacher.userid}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            name = userData.fullname || 'Không rõ';
          }
        }
        setTeacherName(name);

      } catch (err) {
        setError('Không thể tải dữ liệu. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };
    if (sessionid) {
      fetchSessionAndStudents();
    }
  }, [sessionid]);

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
    setSelectedStudents(checked ? students.map(stu => stu.studentid) : []);
  };

  const handleSelectStudent = (studentId, checked) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleSubmitEvaluation = async () => {
    if (selectedStudents.length === 0 || !selectedActivityId) {
      toast.error('Vui lòng chọn học sinh và hoạt động');
      return;
    }
    try {
      setEvaluating(true);
      const studentsArr = selectedStudents.map(id => ({ studentid: id }));
      const activityObj = activities.find(act => act.activityid === Number(selectedActivityId));
      const contentToSend = evaluationContent.trim() || (activityObj ? activityObj.activitytype : '');
      
      const now = new Date();
      const createdAtStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      const evaluationData = {
        periodid: Number(sessionid),
        content: contentToSend,
        activityid: Number(selectedActivityId),
        students: studentsArr,
        createdat: createdAtStr
      };

      const response = await fetch(`${API_URL}/api/Evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evaluationData)
      });
      
      if (!response.ok) {
        throw new Error('Gửi đánh giá thất bại. Vui lòng thử lại.');
      }

      toast.success('Đánh giá đã được gửi thành công!');
      setEvaluationContent('');
      setIsPositive(true);
      setSelectedStudents([]);
      setSelectedActivityId('');
      setShowEvaluationModal(false);

    } catch (err) {
      toast.error(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  const filteredActivities = activities.filter(act => act.isnegative === !isPositive);

  return (
    <div className="flex-1 bg-gray-50/50 p-6">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      
      <div className="mb-6">
        <button
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          onClick={() => navigate(-1)}
        >
          <BackIcon />
          Quay lại
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin buổi học...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
          <p className="font-bold">Lỗi</p>
          <p>{error}</p>
        </div>
      ) : !sessionInfo || !classInfo ? (
        <div className="text-center py-20 text-gray-500">Không tìm thấy thông tin buổi học.</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Thông tin buổi học</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
              <InfoItem icon={<ClassIcon />} label="Lớp" value={classInfo.classname} />
              <InfoItem icon={<PeriodIcon />} label="Tiết" value={sessionInfo.periodno} />
              <InfoItem icon={<CalendarIcon />} label="Ngày" value={new Date(sessionInfo.perioddate).toLocaleDateString('vi-VN')} />
              <InfoItem icon={<TeacherIcon />} label="Giáo viên CN" value={teacherName} />
              <InfoItem icon={<StudentsIcon />} label="Sĩ số" value={`${students.length} học sinh`} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
              <h3 className="text-xl font-bold text-gray-800">Danh sách học sinh</h3>
              {selectedStudents.length > 0 && (
                <button
                  onClick={() => setShowEvaluationModal(true)}
                  className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all text-sm shadow-md"
                >
                  Đánh giá ({selectedStudents.length === students.length ? "cả lớp" : `${selectedStudents.length} học sinh`})
                </button>
              )}
            </div>

            {students.length === 0 ? (
              <div className="text-center py-10 text-gray-500">Không có học sinh nào trong lớp này.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-center w-12">
                        <input
                          type="checkbox"
                          checked={students.length > 0 && selectedStudents.length === students.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">STT</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Họ và tên</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ngày sinh</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phụ huynh</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((stu, idx) => {
                      const parent = parentAccounts.find(acc => acc.userid === stu.parentid);
                      return (
                        <tr key={stu.studentid} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(stu.studentid)}
                              onChange={(e) => handleSelectStudent(stu.studentid, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{stu.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{new Date(stu.dateofbirth).toLocaleDateString('vi-VN')}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {parent ? (
                              <div>
                                <div className="font-semibold text-gray-900">{parent.fullname}</div>
                                <div className="text-xs">{parent.email || ''}</div>
                                <div className="text-xs">{parent.phonenumber || ''}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Chưa có thông tin</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showEvaluationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg space-y-6 transform transition-all">
            <h3 className="text-2xl font-bold text-center text-gray-800">Tạo đánh giá mới</h3>
            <p className="text-sm text-center text-gray-500 -mt-4">
                Đánh giá cho {selectedStudents.length} học sinh
            </p>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Loại đánh giá</label>
              <div className="flex w-full bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setIsPositive(true)}
                  className={`w-1/2 py-2 rounded-md font-semibold text-sm transition-all ${isPositive ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                  disabled={evaluating}
                >Tích cực</button>
                <button
                  onClick={() => setIsPositive(false)}
                  className={`w-1/2 py-2 rounded-md font-semibold text-sm transition-all ${!isPositive ? 'bg-white shadow text-red-600' : 'text-gray-600'}`}
                  disabled={evaluating}
                >Tiêu cực</button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="activity-select">Hoạt động</label>
              <select
                id="activity-select"
                value={selectedActivityId}
                onChange={e => setSelectedActivityId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                disabled={evaluating}
              >
                <option value="">-- Chọn hoạt động --</option>
                {filteredActivities.map(act => (
                  <option key={act.activityid} value={act.activityid}>{act.activitytype}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="evaluation-content">Nội dung (không bắt buộc)</label>
              <textarea
                id="evaluation-content"
                value={evaluationContent}
                onChange={(e) => setEvaluationContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                rows="4"
                placeholder="Nhập nội dung để mô tả chi tiết hơn..."
                disabled={evaluating}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button
                onClick={() => setShowEvaluationModal(false)}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold text-sm disabled:opacity-50"
                disabled={evaluating}
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitEvaluation}
                disabled={!selectedActivityId || selectedStudents.length === 0 || evaluating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm disabled:opacity-50 flex items-center gap-2"
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

export default SessionDetail; 