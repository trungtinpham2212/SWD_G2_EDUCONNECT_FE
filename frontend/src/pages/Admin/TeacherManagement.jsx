import React, { useEffect, useState } from 'react';
import API_URL from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const TeacherManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [teachers, setTeachers] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [sections, setSections] = useState([]);
  // const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullname: '',
    email: '',
    phonenumber: '',
    address: '',
    roleid: 2,
    subjectid: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('user');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userRes, teacherRes, subjectRes, classRes, yearRes, sectionRes, evaluationRes] = await Promise.all([
        fetch(`${API_URL}/api/user-accounts`),
        fetch(`${API_URL}/api/teachers`),
        fetch(`${API_URL}/api/subjects`),
        fetch(`${API_URL}/api/classes`),
        fetch(`${API_URL}/api/school-years`),
        fetch(`${API_URL}/api/periods`)
        // fetch(`${API_URL}/api/evaluations`)
      ]);
      const userData = await userRes.json();
      const teacherData = await teacherRes.json();
      const subjectData = await subjectRes.json();
      const classData = await classRes.json();
      const yearData = await yearRes.json();
      const sectionData = await sectionRes.json();
      // const evaluationData = await evaluationRes.json();

      setUserAccounts(userData.filter(u => u.roleid === 2));
      setTeachers(teacherData);
      setSubjects(subjectData);
      setClasses(classData);
      setSchoolYears(yearData);
      setSections(sectionData);
      // setEvaluations(evaluationData);
      setError(null);
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi lấy dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSubjectName = (subjectid) => {
    const subject = subjects.find(s => String(s.subjectid) === String(subjectid));
    return subject ? subject.subjectname : '-';
  };

  const getHomeroomClass = (teacherid) => {
    const cls = classes.find(c => c.teacherhomeroomid === teacherid);
    if (!cls) return null;
    const year = schoolYears.find(y => y.schoolyearid === cls.schoolyearid);
    return {
      classname: cls.classname,
      year: year ? year.year : '-'
    };
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      const teacher = teachers.find(t => t.userid === user.userid);
      setForm({
        username: user.username,
        password: '',
        fullname: user.fullname,
        email: user.email,
        phonenumber: user.phonenumber,
        address: user.address,
        roleid: 2,
        subjectid: teacher ? teacher.subjectid : ''
      });
      setEditingUser(user);
    } else {
      setForm({
        username: '',
        password: '',
        fullname: '',
        email: '',
        phonenumber: '',
        address: '',
        roleid: 2,
        subjectid: ''
      });
      setEditingUser(null);
    }
    setActiveTab('user');
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (activeTab === 'user') {
        if (editingUser) {
          // Chỉ gửi password nếu có nhập
          const updateData = {
            userId: editingUser.userid.toString(), // Chuyển thành string theo yêu cầu API
            fullname: form.fullname.trim(),
            email: form.email.trim(),
            phoneNumber: form.phonenumber.trim(),
            address: form.address.trim(),
            roleId: 2 // Thêm roleId theo yêu cầu API
          };

          // Luôn gửi password - nếu không nhập mới thì gửi password hiện tại
          if (form.password.trim()) {
            updateData.password = form.password.trim();
          } else {
            // Nếu không nhập password mới, gửi password hiện tại (có thể cần lấy từ user data)
            updateData.password = editingUser.password || ''; // Hoặc để trống nếu không có
          }

          const response = await fetch(`${API_URL}/api/user-accounts/${editingUser.userid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
          });

          const text = await response.text();
          const normalized = text.replace(/"/g, '').trim();

          if (response.ok || normalized.toLowerCase().includes('success') || normalized.includes('Update successful')) {
            await fetchData();
            setShowModal(false);
            toast.success('Cập nhật giáo viên thành công!');
          } else {
            toast.error('Lỗi khi cập nhật: ' + normalized);
          }
        } else {
          // Sử dụng API mới hỗ trợ subjectId khi tạo giáo viên
            const response = await fetch(`${API_URL}/auth/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: form.username.trim(),
                password: form.password.trim(),
                fullname: form.fullname.trim(),
                email: form.email.trim(),
              phoneNumber: form.phonenumber.trim(), // Đổi tên field theo API
                address: form.address.trim(),
              roleId: 2, // Đổi tên field theo API
              subjectId: form.subjectid ? Number(form.subjectid) : 0 // Thêm subjectId
              })
            });
          
            const textRes = await response.text();
            const normalized = textRes.replace(/"/g, '').trim();
          
          if (response.ok && (normalized.toLowerCase().includes('success') || normalized.toLowerCase().includes('registration successful'))) {
                  await fetchData();
                  setShowModal(false);
                  toast.success('Tạo giáo viên thành công!');
                } else {
            toast.error('Lỗi khi tạo giáo viên: ' + normalized);
          }
        }
      } else if (activeTab === 'subject' && editingUser) {
        const teacher = teachers.find(t => t.userid === editingUser.userid);
        if (teacher && form.subjectid && form.subjectid !== teacher.subjectid) {
          const response = await fetch(`${API_URL}/api/teachers/${teacher.teacherid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              teacherId: teacher.teacherid,
              subjectId: Number(form.subjectid)
            })
          });

          const responseText = await response.text();
          const normalized = responseText.replace(/"/g, '').trim();

          if (response.ok || normalized.toLowerCase().includes('success')) {
            await fetchData();
            setShowModal(false);
            toast.success('Gán môn học thành công!');
          } else {
            toast.error('Lỗi khi gán môn học: ' + normalized);
          }
        } else if (!teacher) {
          toast.error('Không tìm thấy thông tin giáo viên');
        } else if (!form.subjectid) {
          toast.error('Vui lòng chọn môn học');
        } else if (form.subjectid === teacher.subjectid) {
          toast.info('Môn học đã được gán cho giáo viên này');
        }
        setShowModal(false);
      }
    } catch (error) {
      console.error(error);
      toast.error('Đã xảy ra lỗi khi xử lý.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (user) => {
    const teacher = teachers.find(t => t.userid === user.userid);
    
    setUserToDelete({
      ...user,
      teacherid: teacher?.teacherid || null
    });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      const teacher = teachers.find(t => t.userid === userToDelete.userid);
      
      // Nếu có teacher record, kiểm tra các ràng buộc trước khi xóa
      if (teacher) {
        // Kiểm tra chủ nhiệm lớp
        const homeroomClass = classes.find(c => c.teacherhomeroomid === teacher.teacherid);
        if (homeroomClass) {
          toast.error(`Không thể xóa giáo viên vì đang làm chủ nhiệm lớp ${homeroomClass.classname}. Vui lòng đổi giáo viên chủ nhiệm trước.`);
          return;
        }

        // Kiểm tra tiết học
        const hasPeriods = sections.some(s => s.teacherid === teacher.teacherid);
        if (hasPeriods) {
          toast.error('Không thể xóa giáo viên vì có tiết học được gán. Vui lòng xóa tất cả tiết học của giáo viên này trước.');
          return;
        }

        // Kiểm tra đánh giá
        // const hasEvaluations = evaluations.some(e => e.teacherid === teacher.teacherid);
        // if (hasEvaluations) {
        //   toast.error('Không thể xóa giáo viên vì có đánh giá được tạo. Vui lòng xóa tất cả đánh giá của giáo viên này trước.');
        //   return;
        // }

        // Xóa teacher record trước
        const teacherRes = await fetch(`${API_URL}/api/teachers/${teacher.teacherid}`, {
          method: 'DELETE'
        });
        
        if (!teacherRes.ok) {
          const teacherResText = await teacherRes.text();
          if (teacherResText.includes('REFERENCE constraint') || teacherResText.includes('foreign key')) {
            toast.error('Không thể xóa giáo viên vì có dữ liệu liên quan. Vui lòng xóa các dữ liệu liên quan trước.');
          } else {
            toast.error('Lỗi khi xóa hồ sơ giáo viên.');
          }
          return;
        }
      }

      // Xóa user account
      const userRes = await fetch(`${API_URL}/api/user-accounts/${userToDelete.userid}`, {
        method: 'DELETE'
      });
      
      const userResText = await userRes.text();
      const userResNormalized = userResText.replace(/"/g, '').trim();
      
      const isSuccess = userRes.ok || 
                       userResNormalized.toLowerCase().includes('success') ||
                       userResNormalized.toLowerCase().includes('delete') ||
                       userRes.status === 200 ||
                       userRes.status === 204;
      
      if (isSuccess) {
        await fetchData();
        toast.success('Xóa giáo viên thành công!');
      } else {
        if (userResText.includes('foreign key') || userResText.includes('REFERENCE constraint') || userResText.includes('entity changes')) {
          toast.error('Đã xóa hồ sơ giáo viên nhưng không thể xóa tài khoản. Vui lòng thử lại sau.');
          await fetchData();
        } else {
          toast.error('Lỗi khi xóa tài khoản.');
        }
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xóa giáo viên.');
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Quản lý giáo viên</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => handleOpenModal()}>Thêm giáo viên</button>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách giáo viên...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và tên</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Môn dạy</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chủ nhiệm lớp</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Năm học</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-4 text-center text-gray-500">Không có giáo viên nào</td>
                  </tr>
                ) : (
                  userAccounts.map((u, idx) => {
                    const teacher = teachers.find(t => t.userid === u.userid);
                    const subjectName = teacher ? getSubjectName(teacher.subjectid) : '-';
                    const homeroom = teacher ? getHomeroomClass(teacher.teacherid) : null;
                    return (
                      <tr key={u.userid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{u.fullname}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{u.email}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{subjectName}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{homeroom ? homeroom.classname : <span className="text-gray-400">-</span>}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{homeroom ? homeroom.year : <span className="text-gray-400">-</span>}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <button className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 mr-2" onClick={() => handleOpenModal(u)}>Sửa</button>
                          <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700" onClick={() => handleDelete(u)}>Xóa</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Modal thêm/sửa giáo viên */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">{editingUser ? 'Sửa giáo viên' : 'Thêm giáo viên mới'}</h3>
            {editingUser && (
              <div className="flex mb-4 gap-2">
                <button
                  className={`px-4 py-2 rounded ${activeTab === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  onClick={() => setActiveTab('user')}
                >
                  Sửa thông tin
                </button>
                <button
                  className={`px-4 py-2 rounded ${activeTab === 'subject' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  onClick={() => setActiveTab('subject')}
                >
                  Gán môn học
                </button>
              </div>
            )}
            {activeTab === 'user' && (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Tên đăng nhập</label>
                  <input type="text" name="username" value={form.username} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" disabled={!!editingUser} />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                  <input type="password" name="password" value={form.password} onChange={handleChange} required={!editingUser} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder={editingUser ? 'Để trống nếu không muốn đổi' : ''} />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                  <input type="text" name="fullname" value={form.fullname} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                  <input type="text" name="phonenumber" value={form.phonenumber} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                  <input type="text" name="address" value={form.address} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                {!editingUser && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Môn dạy</label>
                  <select name="subjectid" value={form.subjectid} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    <option value="">-- Chọn môn --</option>
                    {subjects.map(sub => (
                      <option key={sub.subjectid} value={sub.subjectid}>{sub.subjectname}</option>
                    ))}
                  </select>
                </div>
                )}
                <div className="flex justify-end mt-6">
                  <button 
                    type="button" 
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700 mr-2" 
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Lưu'}
                  </button>
                </div>
              </form>
            )}
            {activeTab === 'subject' && editingUser && (
              <form
                onSubmit={handleSubmit}
              >
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Chọn môn học</label>
                  <select name="subjectid" value={form.subjectid} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    <option value="">-- Chọn môn --</option>
                    {subjects.map(sub => (
                      <option key={sub.subjectid} value={sub.subjectid}>{sub.subjectname}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end mt-6">
                  <button 
                    type="button" 
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700 mr-2" 
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Lưu'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      <ToastContainer />
      {/* Modal xác nhận xóa */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Xác nhận xóa giáo viên</h3>
            <p>Bạn có chắc chắn muốn xóa giáo viên này không?</p>
            <div className="flex justify-end mt-6 gap-2">
              <button 
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700" 
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Hủy
              </button>
              <button 
                className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`} 
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;