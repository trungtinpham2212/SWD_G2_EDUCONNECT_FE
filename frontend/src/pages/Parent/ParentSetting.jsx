import React, { useState, useEffect, useRef } from 'react';
import API_URL from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaSave, FaCloudUploadAlt, FaEye, FaEyeSlash, FaEdit } from 'react-icons/fa';
import { getAuthHeaders, removeToken } from '../../utils/auth';

const ParentSetting = ({ user }) => {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formError, setFormError] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
    fullname: '',
    email: '',
    phonenumber: '',
    address: '',
    username: '',
    avatarurl: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [initialProfileForm, setInitialProfileForm] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const res = await fetch(`${API_URL}/api/user-accounts/${user.userId}`, { headers: getAuthHeaders() });
        const data = await res.json();
        setProfileForm({
          currentPassword: '',
          password: '',
          confirmPassword: '',
          fullname: data.fullname || '',
          email: data.email || '',
          phonenumber: data.phonenumber || '',
          address: data.address || '',
          username: data.username,
          avatarurl: data.avatarurl || ''
        });
        setAvatarUrl(data.avatarurl || '');
        setAvatarRemoved(false);
      } catch (err) {
        toast.error('Không lấy được thông tin cá nhân');
      } finally {
        setLoadingProfile(false);
      }
    };
    if (user?.userId) fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!loadingProfile) {
      setInitialProfileForm(profileForm);
    }
  }, [loadingProfile]);

  const handleProfileChange = (e) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAvatarChange = (e) => {
    setUploading(true);
    const file = e.target.files[0];
    if (!file) {
      setUploading(false);
      return;
    }
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
    setTimeout(() => setUploading(false), 500);
  };
  const handleAvatarClick = () => {
    if (!uploading && avatarInputRef.current) {
      avatarInputRef.current.value = null;
      avatarInputRef.current.click();
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append('userId', user.userId.toString());
      formData.append('fullname', profileForm.fullname);
      formData.append('email', profileForm.email);
      formData.append('phonenumber', profileForm.phonenumber);
      formData.append('address', profileForm.address);
      formData.append('username', profileForm.username);
      if (avatarFile) {
        formData.append('avatarFile', avatarFile);
      } else if (avatarUrl && avatarUrl !== '') {
        formData.append('avatarurl', avatarUrl);
      } else {
        formData.append('removeAvatar', 'true');
      }
      formData.append('password', '');
      const response = await fetch(`${API_URL}/api/user-accounts/${user.userId}`, {
        method: 'PUT',
        body: formData,
        headers: getAuthHeaders().Authorization ? { Authorization: getAuthHeaders().Authorization } : undefined
      });
      let text = await response.text();
      const normalized = text.replace(/"/g, '').trim();
      if (response.ok || normalized.toLowerCase().includes('success') || normalized.includes('Update successful')) {
        let newAvatarUrl = '';
        try {
          const json = JSON.parse(text);
          newAvatarUrl = json.avatarUrl || json.avatarurl || '';
        } catch {}
        setAvatarUrl(newAvatarUrl);
        setProfileForm(prev => ({ ...prev, avatarurl: newAvatarUrl }));
        // Cập nhật user object trong localStorage
        const updatedUser = { ...user, avatarUrl: newAvatarUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success('Cập nhật thông tin cá nhân thành công!');
        setProfileForm(prev => ({ ...prev, currentPassword: '', password: '', confirmPassword: '' }));
        setShowChangePasswordModal(false);
        setIsEditing(false);
        setAvatarFile(null);
        setAvatarRemoved(false);
        // Không setAvatarUrl('') ở đây nữa!
      } else {
        toast.error('Lỗi khi cập nhật: ' + normalized);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Có lỗi xảy ra khi cập nhật thông tin cá nhân');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setFormError('');
    setShowConfirmModal(true);
  };

  const handleConfirmChangePassword = async () => {
    setChangePasswordLoading(true);
    
    // Kiểm tra tất cả điều kiện trước khi đổi mật khẩu
    if (!profileForm.currentPassword) {
      toast.error("Vui lòng nhập mật khẩu hiện tại.");
      setChangePasswordLoading(false);
      setShowConfirmModal(false);
      return;
    }
    if (!profileForm.password) {
      toast.error("Vui lòng nhập mật khẩu mới.");
      setChangePasswordLoading(false);
      setShowConfirmModal(false);
      return;
    }
    if (profileForm.password !== profileForm.confirmPassword) {
      toast.error("Mật khẩu mới và xác nhận không trùng khớp.");
      setChangePasswordLoading(false);
      setShowConfirmModal(false);
      return;
    }
    if (profileForm.currentPassword === profileForm.password) {
      toast.error('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      setChangePasswordLoading(false);
      setShowConfirmModal(false);
      return;
    }
    
    // Xác thực mật khẩu hiện tại với server
    const verifyRes = await fetch(`${API_URL}/api/user-accounts/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: profileForm.username,
        password: profileForm.currentPassword,
      }),
    });
    
    if (!verifyRes.ok) {
      toast.error("Mật khẩu hiện tại không đúng.");
      setChangePasswordLoading(false);
      setShowConfirmModal(false);
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('userId', user.userId.toString());
      formData.append('fullname', profileForm.fullname);
      formData.append('email', profileForm.email);
      formData.append('phonenumber', profileForm.phonenumber);
      formData.append('address', profileForm.address);
      formData.append('username', profileForm.username);
      if (avatarFile) {
        formData.append('avatarFile', avatarFile);
      } else if (avatarUrl && avatarUrl !== '') {
        formData.append('avatarurl', avatarUrl);
      } else {
        formData.append('removeAvatar', 'true');
      }
      formData.append('password', profileForm.password);
      
      const response = await fetch(`${API_URL}/api/user-accounts/${user.userId}`, {
        method: 'PUT',
        body: formData,
        headers: getAuthHeaders()
      });
      
      let text = await response.text();
      const normalized = text.replace(/"/g, '').trim();
      
      if (response.ok || normalized.toLowerCase().includes('success') || normalized.includes('Update successful')) {
        toast.success('Đổi mật khẩu thành công! Bạn sẽ được chuyển về trang đăng nhập trong 2 giây.');
        setProfileForm(prev => ({ ...prev, currentPassword: '', password: '', confirmPassword: '' }));
        setShowChangePasswordModal(false);
        setShowConfirmModal(false);
        setIsEditing(false);
        setAvatarFile(null);
        setAvatarRemoved(false);
        
        // Đợi 2 giây rồi logout
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }, 2000);
      } else {
        toast.error('Lỗi khi đổi mật khẩu: ' + normalized);
        setShowConfirmModal(false);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Có lỗi xảy ra khi đổi mật khẩu');
      setShowConfirmModal(false);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const isDirty = isEditing && initialProfileForm && (
    profileForm.fullname !== initialProfileForm.fullname ||
    profileForm.email !== initialProfileForm.email ||
    profileForm.phonenumber !== initialProfileForm.phonenumber ||
    profileForm.address !== initialProfileForm.address ||
    avatarFile ||
    avatarRemoved
  );

  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Cài đặt phụ huynh</h2>
      <div className="bg-white rounded-lg shadow-md p-6 relative">
        <h3 className="text-lg font-medium mb-4 flex items-center justify-between">
          <span>Chỉnh sửa thông tin cá nhân</span>
          {!isEditing && (
            <button
              className="text-blue-600 hover:text-blue-800 p-2 rounded-full"
              onClick={() => setIsEditing(true)}
              title="Chỉnh sửa thông tin"
            >
              <FaEdit className="text-xl" />
            </button>
          )}
        </h3>
        {loadingProfile ? (
          <div>Đang tải thông tin...</div>
        ) : (
          <form onSubmit={handleUpdateProfile}>
            <div className="flex flex-col md:flex-row gap-8 items-center">
              {/* Avatar bên trái */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {avatarUrl ? (
                    <div className="relative flex flex-col items-center">
                      <img
                        src={avatarUrl || profileForm.avatarurl || user.avatarUrl || ''}
                        alt="avatar"
                        className={`w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow mb-2 transition-all ${uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={isEditing && !uploading ? handleAvatarClick : undefined}
                        style={{ pointerEvents: isEditing && !uploading ? 'auto' : 'none' }}
                      />
                      {isEditing && !uploading && (
                        <span className="text-md text-black-100 mt-1">Bấm vào để đổi ảnh đại diện</span>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-blue-300 mb-2 ${uploading ? 'opacity-60 cursor-not-allowed' : isEditing ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                      onClick={isEditing && !uploading ? handleAvatarClick : undefined}
                      style={{ pointerEvents: isEditing && !uploading ? 'auto' : 'none' }}
                    >
                      <span className="text-center px-2">Bấm vào để tải ảnh đại diện</span>
                    </div>
                  )}
                  <input
                    ref={avatarInputRef}
                    id="avatarInput"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    tabIndex={-1}
                    disabled={uploading || !isEditing}
                  />
                </div>
              </div>
              {/* Thông tin bên phải */}
              <div className="flex-1">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-800 mb-1">{profileForm.fullname}</div>
                  <div className="text-base md:text-lg font-semibold bg-gray-100 text-gray-700 rounded px-4 py-2 mb-2 inline-block">{profileForm.username}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      required
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white disabled:bg-gray-100"
                    />
                  </div>
                  {isEditing && (
                    <div>
                      <button
                        type="button"
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 mt-6"
                        onClick={() => setShowChangePasswordModal(true)}
                      >
                        Đổi mật khẩu
                      </button>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      name="phonenumber"
                      value={profileForm.phonenumber}
                      onChange={handleProfileChange}
                      required
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white disabled:bg-gray-100"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                    <textarea
                      name="address"
                      value={profileForm.address}
                      onChange={handleProfileChange}
                      rows="2"
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white disabled:bg-gray-100"
                    />
                  </div>
                </div>
                {formError && <div className="text-red-600 text-sm mt-2">{formError}</div>}
                {isEditing && (
                  <div className="mt-6 flex justify-end">
                    <button
                      type="submit"
                      disabled={!isDirty || isUpdating}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <>
                          <FaSave className="inline mr-2" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <FaSave className="inline mr-2" />
                          Lưu thay đổi
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="ml-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      onClick={() => { 
                        setIsEditing(false); 
                        setFormError(""); 
                        setProfileForm(initialProfileForm);
                        setAvatarRemoved(false);
                      }}
                      disabled={isUpdating}
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
      {/* Modal đổi mật khẩu */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
              onClick={() => {
                setShowChangePasswordModal(false);
                setFormError('');
                setProfileForm(prev => ({
                  ...prev,
                  currentPassword: '',
                  password: '',
                  confirmPassword: ''
                }));
              }}
              aria-label="Đóng"
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4 text-center">Đổi mật khẩu</h3>
            <form
              onSubmit={handleUpdatePassword}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={profileForm.currentPassword}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                  <span
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-400"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                  >
                    {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="password"
                    value={profileForm.password}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    autoComplete="new-password"
                    placeholder="Nhập mật khẩu mới"
                  />
                  <span
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-400"
                    onClick={() => setShowNewPassword((v) => !v)}
                  >
                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={profileForm.confirmPassword}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Nhập lại mật khẩu mới"
                    autoComplete="new-password"
                  />
                  <span
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-400"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>
              {formError && <div className="text-red-600 text-sm mt-2">{formError}</div>}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setFormError('');
                    setProfileForm(prev => ({
                      ...prev,
                      currentPassword: '',
                      password: '',
                      confirmPassword: ''
                    }));
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!profileForm.currentPassword || !profileForm.password || !profileForm.confirmPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
                >
                  <FaSave className="inline mr-2" />
                  Tiếp tục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal xác nhận đổi mật khẩu */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
              onClick={() => setShowConfirmModal(false)}
              aria-label="Đóng"
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4 text-center">
              Xác nhận đổi mật khẩu
            </h3>
            <div className="text-center mb-6">
              <p className="text-gray-700">
                Bạn có chắc chắn muốn đổi mật khẩu? Bạn sẽ bị đăng xuất khỏi hệ thống sau khi đổi mật khẩu.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                onClick={() => setShowConfirmModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmChangePassword}
                disabled={changePasswordLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
              >
                {changePasswordLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  'Đổi mật khẩu'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default ParentSetting;
