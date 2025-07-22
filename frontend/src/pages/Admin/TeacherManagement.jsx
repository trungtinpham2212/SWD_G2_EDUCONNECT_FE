import React, { useEffect, useState } from 'react';
import API_URL from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getTokenFromStorage, getAuthHeaders } from '../../utils/auth';

const TeacherManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
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
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('user');



  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra token trước khi gọi API
      const token = getTokenFromStorage();
      if (!token) {
        setError('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        toast.error('Vui lòng đăng nhập lại');
        return;
      }

      const [teacherRes, subjectRes, classRes] = await Promise.all([
        fetch(`${API_URL}/api/teachers?page=1&pageSize=100`, { 
          headers: getAuthHeaders(),
          credentials: 'include'
        }),
        fetch(`${API_URL}/api/subjects?page=1&pageSize=50`, { 
          headers: getAuthHeaders(),
          credentials: 'include'
        }),
        fetch(`${API_URL}/api/classes?page=1&pageSize=100`, { 
          headers: getAuthHeaders(),
          credentials: 'include'
        }),
      ]);
      
      // Kiểm tra lỗi 401 cho từng response
      if (teacherRes.status === 401 || subjectRes.status === 401 || classRes.status === 401) {
        localStorage.removeItem('token');
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      if (!teacherRes.ok || !subjectRes.ok || !classRes.ok) {
        throw new Error(`HTTP error! Teacher: ${teacherRes.status}, Subject: ${subjectRes.status}, Class: ${classRes.status}`);
      }

      const teacherDataRaw = await teacherRes.json();
      const subjectDataRaw = await subjectRes.json();
      const classDataRaw = await classRes.json();

      const teacherData = Array.isArray(teacherDataRaw.items) ? teacherDataRaw.items : [];
      const subjectData = Array.isArray(subjectDataRaw.items) ? subjectDataRaw.items : [];
      const classData = Array.isArray(classDataRaw.items) ? classDataRaw.items : [];
      
      setTeachers(teacherData);
      setSubjects(subjectData);
      setClasses(classData);
      setError(null);
    } catch (error) {
      console.error('Fetch error:', error);
      if (error.message.includes('401')) {
        localStorage.removeItem('token');
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setError('Có lỗi xảy ra khi lấy dữ liệu: ' + error.message);
        toast.error('Có lỗi xảy ra khi lấy dữ liệu: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getTokenFromStorage();
    
    if (!token) {
      setError('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
      setLoading(false);
      return;
    }
    
    fetchData();
  }, []);

  const getHomeroomClass = (teacherid) => {
    const cls = classes.find(c => c.teacherhomeroomid === teacherid);
    if (!cls) return null;
    // Sử dụng trực tiếp schoolYear từ API response thay vì tìm kiếm
    return {
      classname: cls.classname,
      year: cls.schoolYear || '-',
      grade: cls.grade,
      studentCount: cls.liststudent ? cls.liststudent.length : 0
    };
  };

  const handleOpenModal = (teacher = null) => {
    if (teacher) {
      setForm({
        username: teacher.user?.username || '',
        password: '',
        fullname: teacher.user?.fullname || '',
        email: teacher.user?.email || '',
        phonenumber: teacher.user?.phonenumber || '',
        address: teacher.user?.address || '',
        roleid: 2,
        subjectid: teacher.subjectid || ''
      });
      setEditingTeacher(teacher);
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
      setEditingTeacher(null);
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
      const token = getTokenFromStorage();
      if (!token) {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      if (activeTab === 'user') {
        if (editingTeacher) {
          // Sửa giáo viên
          const formData = new FormData();
          formData.append('Password', form.password);
          formData.append('Fullname', form.fullname);
          formData.append('Email', form.email);
          formData.append('PhoneNumber', form.phonenumber);
          formData.append('Address', form.address);
          formData.append('RoleId', 2);
          
          const response = await fetch(`${API_URL}/api/user-accounts/${editingTeacher.userid}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });

          if (response.status === 401) {
            localStorage.removeItem('token');
            toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
          }

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
          // Tạo giáo viên mới
          const response = await fetch(`${API_URL}/api/user-accounts/register`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              username: form.username,
              password: form.password,
              fullname: form.fullname,
              email: form.email,
              phoneNumber: form.phonenumber,
              address: form.address,
              roleId: 2,
              subjectId: form.subjectid ? Number(form.subjectid) : 0
            })
          });

          if (response.status === 401) {
            localStorage.removeItem('token');
            toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
          }

          let data;
          const resText = await response.text();
          try {
            data = JSON.parse(resText);
          } catch {
            data = resText;
          }
          if (response.ok && (typeof data === 'object' || (typeof data === 'string' && data.toLowerCase().includes('success')))) {
            await fetchData();
            setShowModal(false);
            toast.success('Tạo giáo viên thành công!');
          } else {
            const msg = typeof data === 'string' ? data : (data.message || 'Tạo giáo viên thất bại!');
            toast.error('Lỗi khi tạo giáo viên: ' + msg);
          }
        }
      } else if (activeTab === 'subject' && editingTeacher) {
        // Gán môn học
        if (form.subjectid && form.subjectid !== editingTeacher.subjectid) {
          const formData = new FormData();
          formData.append('teacherId', editingTeacher.teacherid);
          formData.append('subjectId', Number(form.subjectid));
          
          const response = await fetch(`${API_URL}/api/teachers/${editingTeacher.teacherid}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getTokenFromStorage()}` },
            body: formData
          });

          if (response.status === 401) {
            localStorage.removeItem('token');
            toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
          }

          const responseText = await response.text();
          const normalized = responseText.replace(/"/g, '').trim();
          if (response.ok || normalized.toLowerCase().includes('success')) {
            await fetchData();
            setShowModal(false);
            toast.success('Gán môn học thành công!');
          } else {
            toast.error('Lỗi khi gán môn học: ' + normalized);
          }
        } else if (!form.subjectid) {
          toast.error('Vui lòng chọn môn học');
        } else if (form.subjectid === editingTeacher.subjectid) {
          toast.info('Môn học đã được gán cho giáo viên này');
        }
        setShowModal(false);
      }
    } catch (error) {
      if (error.message.includes('401') || error.status === 401) {
        localStorage.removeItem('token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        toast.error('Đã xảy ra lỗi khi xử lý: ' + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (teacher) => {
    setTeacherToDelete(teacher);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!teacherToDelete) return;
    
    setIsDeleting(true);
    try {
      const token = getTokenFromStorage();
      if (!token) {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      // Kiểm tra chủ nhiệm lớp
      const homeroomClass = classes.find(c => c.teacherhomeroomid === teacherToDelete.teacherid);
      if (homeroomClass) {
        toast.error(`Không thể xóa giáo viên vì đang làm chủ nhiệm lớp ${homeroomClass.classname}. Vui lòng đổi giáo viên chủ nhiệm trước.`);
        return;
      }

      // Kiểm tra tiết học
      if (teacherToDelete.periods && teacherToDelete.periods.length > 0) {
        toast.error('Không thể xóa giáo viên vì có tiết học được gán. Vui lòng xóa tất cả tiết học của giáo viên này trước.');
        return;
      }

      // Xóa teacher record trước
      const teacherRes = await fetch(`${API_URL}/api/teachers/${teacherToDelete.teacherid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (teacherRes.status === 401) {
        localStorage.removeItem('token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      if (!teacherRes.ok) {
        const teacherResText = await teacherRes.text();
        if (teacherResText.includes('REFERENCE constraint') || teacherResText.includes('foreign key')) {
          toast.error('Không thể xóa giáo viên vì có dữ liệu liên quan. Vui lòng xóa các dữ liệu liên quan trước.');
        } else {
          toast.error('Lỗi khi xóa hồ sơ giáo viên.');
        }
        return;
      }

      // Xóa user account
      const userRes = await fetch(`${API_URL}/api/user-accounts/${teacherToDelete.userid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (userRes.status === 401) {
        localStorage.removeItem('token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      
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
      if (error.message.includes('401') || error.status === 401) {
        localStorage.removeItem('token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        toast.error('Có lỗi xảy ra khi xóa giáo viên: ' + error.message);
      }
    } finally {
      setShowDeleteModal(false);
      setTeacherToDelete(null);
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Lỗi xác thực</h3>
                <p className="mt-1 text-sm text-red-600">{error}</p>
                {error.includes('token') && (
                  <div className="mt-3">
                    <button 
                      onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                      }}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Đăng nhập lại
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sĩ số</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-4 text-center text-gray-500">Không có giáo viên nào</td>
                  </tr>
                ) : (
                  teachers.map((teacher, idx) => {
                    const subjectName = teacher.subject?.subjectname || '-';
                    const homeroom = getHomeroomClass(teacher.teacherid);
                    return (
                      <tr key={teacher.teacherid}>
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{teacher.user?.fullname || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{teacher.user?.email || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{subjectName}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {homeroom ? (
                            <span className="font-medium">{homeroom.classname}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{homeroom ? homeroom.year : <span className="text-gray-400">-</span>}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {homeroom ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {homeroom.studentCount} học sinh
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <button className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 mr-2" onClick={() => handleOpenModal(teacher)}>Sửa</button>
                          <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700" onClick={() => handleDelete(teacher)}>Xóa</button>
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
            <h3 className="text-xl font-bold mb-4">{editingTeacher ? 'Sửa giáo viên' : 'Thêm giáo viên mới'}</h3>
            {editingTeacher && (
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
                  <input type="text" name="username" value={form.username} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" disabled={!!editingTeacher} />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                  <input type="password" name="password" value={form.password} onChange={handleChange} required={!editingTeacher} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder={editingTeacher ? 'Để trống nếu không muốn đổi' : ''} />
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
                {!editingTeacher && (
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
            {activeTab === 'subject' && editingTeacher && (
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