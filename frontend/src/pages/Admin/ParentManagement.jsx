import React, { useEffect, useState } from 'react';
import API_URL from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ITEMS_PER_PAGE = 10;

const ParentManagement = ({ user, active, setActive, isSidebarOpen, setSidebarOpen }) => {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullname: '',
    email: '',
    phoneNumber: '',
    address: '',
    role: 3
  });
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Helper lấy token từ localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userRes, studentRes, classRes] = await Promise.all([
        fetch(`${API_URL}/api/user-accounts`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/students?page=1&pageSize=100`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/classes?page=1&pageSize=10`, { headers: getAuthHeaders() })
      ]);
      const userData = await userRes.json();
      const studentData = await studentRes.json();
      const classData = await classRes.json();
      setParents(userData.filter(u => u.roleid === 3));
      setStudents(Array.isArray(studentData.items) ? studentData.items : []);
      setClasses(Array.isArray(classData.items) ? classData.items : []);
      setError(null);
    } catch (err) {
      setError('Không thể tải dữ liệu phụ huynh. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getChildren = (parentid) => {
    return (Array.isArray(students) ? students : []).filter(stu => stu.parentid === parentid);
  };

  const getClassName = (classid) => {
    const cls = classes.find(c => c.classid === classid);
    return cls ? cls.classname : '-';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const totalPages = Math.ceil(parents.length / ITEMS_PER_PAGE);
  const paginatedParents = parents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setForm({
        username: user.username,
        password: '',
        fullname: user.fullname,
        email: user.email,
        phoneNumber: user.phonenumber,
        address: user.address,
        role: user.roleid
      });
      setEditingUser(user);
    } else {
      setForm({
        username: '',
        password: '',
        fullname: '',
        email: '',
        phoneNumber: '',
        address: '',
        role: 3
      });
      setEditingUser(null);
    }
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingUser) {
        // Sửa tài khoản
        const formData = new FormData();
        formData.append('Password', form.password);
        formData.append('Fullname', form.fullname);
        formData.append('Email', form.email);
        formData.append('PhoneNumber', form.phoneNumber);
        formData.append('Address', form.address);
        formData.append('RoleId', form.role);
        const response = await fetch(`${API_URL}/api/user-accounts/${editingUser.userid}`, {
          method: 'PUT',
          headers: { ...getAuthHeaders() },
          body: formData
        });
        const text = await response.text();
        const normalized = text.replace(/"/g, '').trim();
        if (response.ok || normalized.includes('Update successful')) {
          await fetchData();
          setShowModal(false);
          toast.success('Cập nhật phụ huynh thành công!');
        } else {
          toast.error('Có lỗi xảy ra khi cập nhật phụ huynh: ' + normalized);
        }
      } else {
        // Tạo mới
        const response = await fetch(`${API_URL}/api/user-accounts/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            username: form.username,
            password: form.password,
            fullname: form.fullname,
            email: form.email,
            phoneNumber: form.phoneNumber,
            address: form.address,
            roleId: 3
          })
        });
        const text = await response.text();
        const normalized = text.replace(/"/g, '').trim();
        if (response.ok || normalized.includes('Registration successful')) {
          await fetchData();
          setShowModal(false);
          toast.success('Tạo phụ huynh thành công!');
        } else {
          toast.error('Có lỗi xảy ra khi tạo phụ huynh: ' + normalized);
        }
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi lưu phụ huynh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (userid) => {
    setUserToDelete(userid);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/user-accounts/${userToDelete}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        await fetchData();
        toast.success('Xóa phụ huynh thành công!');
      } else {
        const errorText = await response.text();
        toast.error('Có lỗi xảy ra khi xóa phụ huynh: ' + errorText);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xóa phụ huynh.');
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Quản lý phụ huynh</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => handleOpenModal()}>Thêm phụ huynh</button>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách phụ huynh...</p>
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và tên phụ huynh</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số điện thoại</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Con</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedParents.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-4 text-center text-gray-500">Không có phụ huynh nào</td>
                    </tr>
                  ) : (
                    paginatedParents.map((p, idx) => {
                      const children = getChildren(p.userid);
                      return (
                        <tr key={p.userid}>
                          <td className="px-4 py-2 text-sm text-gray-500">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{p.fullname}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{p.email}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{p.phonenumber}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {children.length === 0 ? (
                              <span className="text-gray-400">Không có</span>
                            ) : (
                              <ul className="list-disc pl-4">
                                {children.map(child => (
                                  <li key={child.studentid}>
                                    <b>{child.name}</b> - Lớp: {getClassName(child.classid)} - Ngày sinh: {formatDate(child.dateofbirth)}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <button className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 mr-2" onClick={() => handleOpenModal(p)}>Sửa</button>
                            <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700" onClick={() => handleDelete(p.userid)}>Xóa</button>
                          </td>
                        </tr>
                      );
                    })
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
      {/* Modal thêm/sửa phụ huynh */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">{editingUser ? 'Sửa phụ huynh' : 'Thêm phụ huynh mới'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Tên đăng nhập</label>
                <input type="text" name="username" value={form.username} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
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
                <input type="text" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                <input type="text" name="address" value={form.address} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
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
          </div>
        </div>
      )}
      <ToastContainer />
      {/* Modal xác nhận xóa */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Xác nhận xóa phụ huynh</h3>
            <p>Bạn có chắc chắn muốn xóa phụ huynh này không?</p>
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

export default ParentManagement;