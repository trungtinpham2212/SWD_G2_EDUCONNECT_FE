import React, { useState, useEffect, useRef } from "react";
import API_URL from "../../config/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaUser,
  FaBan,
  FaSearch,
  FaFilter,
  FaEdit,
  FaSave,
  FaTimes,
  FaUnlock,
  FaSort,
  FaCloudUploadAlt,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { getTokenFromStorage, getAuthHeaders, isAuthenticated } from '../../utils/auth';

const AdminSetting = ({
  user,
  active,
  setActive,
  isSidebarOpen,
  setSidebarOpen,
}) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [userAccounts, setUserAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [showBanModal, setShowBanModal] = useState(false);
  const [userToBan, setUserToBan] = useState(null);
  const [isBanning, setIsBanning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sortBy, setSortBy] = useState("status");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Avatar upload
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const avatarInputRef = useRef();

  // Profile form state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    currentPassword: "",
    password: "",
    confirmPassword: "",
    fullname: "",
    email: "",
    phonenumber: "",
    address: "",
    roleid: "",
    username: "",
    avatarurl: "",
  });

  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [confirmChangePassword, setConfirmChangePassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [initialProfileForm, setInitialProfileForm] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  // Fetch user info từ API
  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const res = await fetch(`${API_URL}/api/user-accounts/${user.userId}`);
        const data = await res.json();
        setProfileForm({
          currentPassword: "",
          password: "",
          confirmPassword: "",
          fullname: data.fullname || "",
          email: data.email || "",
          phonenumber: data.phonenumber || "",
          address: data.address || "",
          roleid: data.roleid ?? data.RoleId ?? data.roleId,
          username: data.username,
          avatarurl: data.avatarurl || "",
        });
        setAvatarUrl(data.avatarUrl || data.avatarurl || "");
        setAvatarRemoved(false); // Reset avatar removed state
      } catch (err) {
        toast.error("Không lấy được thông tin cá nhân");
      } finally {
        setLoadingProfile(false);
      }
    };
    if (user?.userId) fetchProfile();
  }, [user]);

  // Khi load profile thành công, lưu initialProfileForm
  useEffect(() => {
    if (!loadingProfile) {
      setInitialProfileForm(profileForm);
    }
  }, [loadingProfile]);

  // Role mapping
  const roleMap = {
    1: "Quản trị viên",
    2: "Giáo viên",
    3: "Phụ huynh",
  };

  useEffect(() => {
    fetchUserAccounts();
  }, []);

  const fetchUserAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/user-accounts`);
      const data = await response.json();
      setUserAccounts(data);
    } catch (error) {
      console.error("Error fetching user accounts:", error);
      toast.error("Có lỗi xảy ra khi tải danh sách tài khoản");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value,
    });
  };

  // Avatar upload handler: just preview and store file, do not upload
  const handleAvatarChange = (e) => {
    setUploading(true);
    const file = e.target.files[0];
    if (!file) {
      setUploading(false);
      return;
    }
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
    setTimeout(() => setUploading(false), 500); // simulate loading, remove if backend upload is async
  };

  const handleAvatarClick = () => {
    if (!uploading && avatarInputRef.current) {
      avatarInputRef.current.value = null; // allow re-upload same file
      avatarInputRef.current.click();
    }
  };

  const handleConfirmChangePassword = async (e) => {
    e.preventDefault();
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
      formData.append('roleid', profileForm.roleid);
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
        let newAvatarUrl = '';
        try {
          const json = JSON.parse(text);
          newAvatarUrl = json.avatarUrl || json.avatarurl || '';
        } catch {}
        setAvatarUrl(newAvatarUrl);
        setProfileForm(prev => ({ ...prev, avatarurl: newAvatarUrl }));
        toast.success('Đổi mật khẩu thành công! Bạn sẽ được chuyển về trang đăng nhập trong 2 giây.');
        setProfileForm((prev) => ({
          ...prev,
          currentPassword: '',
          password: '',
          confirmPassword: '',
        }));
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setFormError("");
    setIsUpdating(true);
    try {
      // Always send all fields, use FormData for multipart/form-data
      const formData = new FormData();
      formData.append("userId", user.userId.toString());
      formData.append("fullname", profileForm.fullname);
      formData.append("email", profileForm.email);
      formData.append("phonenumber", profileForm.phonenumber);
      formData.append("address", profileForm.address);
      formData.append("roleid", profileForm.roleid);
      formData.append("username", profileForm.username);
      // Avatar: if avatarFile exists, send file, else send avatarurl (for legacy, but backend will handle file)
      if (avatarFile) {
        formData.append("avatarFile", avatarFile);
      } else if (avatarUrl && avatarUrl !== '') {
        formData.append("avatarurl", avatarUrl);
      } else {
        // Nếu không có avatarFile và avatarUrl rỗng, gửi flag để xóa avatar
        formData.append("removeAvatar", "true");
      }
      // Password: send empty string for profile update
      formData.append("password", "");
      // Trước khi gửi request cập nhật profile, kiểm tra roleid
      if (profileForm.roleid === undefined || profileForm.roleid === null || isNaN(Number(profileForm.roleid))) {
        toast.error('Không xác định được vai trò (RoleId) của tài khoản.');
        setIsUpdating(false);
        return;
      }
      formData.append('RoleId', profileForm.roleid);
      const response = await fetch(
        `${API_URL}/api/user-accounts/${user.userId}`,
        {
          method: "PUT",
          body: formData,
          headers: getAuthHeaders()
        }
      );
      let text = await response.text();
      const normalized = text.replace(/"/g, "").trim();
      if (
        response.ok ||
        normalized.toLowerCase().includes("success") ||
        normalized.includes("Update successful")
      ) {
        let newAvatarUrl = '';
        try {
          const json = JSON.parse(text);
          newAvatarUrl = json.avatarUrl || json.avatarurl || '';
        } catch {}
        setAvatarUrl(newAvatarUrl);
        setProfileForm(prev => ({ ...prev, avatarurl: newAvatarUrl }));
        toast.success("Cập nhật thông tin cá nhân thành công!");
        setProfileForm((prev) => ({
          ...prev,
          currentPassword: "",
          password: "",
          confirmPassword: "",
        }));
        setShowChangePasswordModal(false);
        setIsEditing(false); // Tự động đóng chế độ chỉnh sửa
        setAvatarFile(null); // Reset avatar file
        setAvatarRemoved(false); // Reset avatar removed state
        // Không setAvatarUrl('') ở đây nữa!
        // Cập nhật user object trong localStorage
        const updatedUser = { ...user, avatarUrl: newAvatarUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        toast.error("Lỗi khi cập nhật: " + normalized);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Có lỗi xảy ra khi cập nhật thông tin cá nhân");
    } finally {
      setIsUpdating(false);
    }
  };

  // Hàm so sánh dữ liệu
  const isDirty = isEditing && initialProfileForm && (
    profileForm.fullname !== initialProfileForm.fullname ||
    profileForm.email !== initialProfileForm.email ||
    profileForm.phonenumber !== initialProfileForm.phonenumber ||
    profileForm.address !== initialProfileForm.address ||
    avatarFile || // nếu có file avatar mới
    avatarRemoved
  );

  const handleBanUser = (userAccount) => {
    setUserToBan({ ...userAccount, action: "ban" });
    setShowBanModal(true);
  };

  const handleUnbanUser = (userAccount) => {
    setUserToBan({ ...userAccount, action: "unban" });
    setShowBanModal(true);
  };

  const confirmBanUser = async () => {
    if (!userToBan || !userToBan.userid) {
      toast.error("Không xác định được tài khoản cần thao tác.");
      setIsBanning(false);
      setShowBanModal(false);
      setUserToBan(null);
      return;
    }
    // Kiểm tra đăng nhập
    if (!isAuthenticated()) {
      toast.error('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.');
      setIsBanning(false);
      setShowBanModal(false);
      setUserToBan(null);
      return;
    }
    setIsBanning(true);
    try {
      // Gọi API mới không cần body, chỉ cần id
      const response = await fetch(
        `${API_URL}/api/user-accounts/${userToBan.userid}/status`,
        {
          method: "PUT",
          headers: getAuthHeaders()
        }
      );
      if (response.ok) {
        const action = userToBan.status ? "khóa" : "mở khóa";
        toast.success(`Đã ${action} tài khoản của ${userToBan.fullname}`);
        await fetchUserAccounts();
      } else {
        const text = await response.text();
        toast.error("Lỗi khi thực hiện thao tác: " + text);
      }
    } catch (error) {
      console.error("Error banning/unbanning user:", error);
      toast.error("Có lỗi xảy ra khi thực hiện thao tác");
    } finally {
      setIsBanning(false);
      setShowBanModal(false);
      setUserToBan(null);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Filter users based on search term and role
  const filteredUsers = userAccounts.filter((user) => {
    const matchesSearch =
      user.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole =
      selectedRole === "" || user.roleid === parseInt(selectedRole);
    const matchesStatus =
      selectedStatus === "" ||
      (selectedStatus === "active" && user.status) ||
      (selectedStatus === "banned" && !user.status);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Sort filtered users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue, bValue;
    switch (sortBy) {
      case "status":
        aValue = a.status ? 1 : 0;
        bValue = b.status ? 1 : 0;
        break;
      case "name":
        aValue = a.fullname.toLowerCase();
        bValue = b.fullname.toLowerCase();
        break;
      case "role":
        aValue = a.roleid;
        bValue = b.roleid;
        break;
      default:
        return 0;
    }
    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold mb-6">Cài đặt Admin</h2>
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("profile")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "profile"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FaUser className="inline mr-2" />
              Thông tin cá nhân
            </button>
            <button
              onClick={() => setActiveTab("ban")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "ban"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FaBan className="inline mr-2" />
              Quản lý tất cả tài khoản
            </button>
          </nav>
        </div>
      </div>
      {/* Profile Tab */}
      {activeTab === "profile" && (
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
                    <div className="text-2xl font-bold text-gray-800 mb-1">
                      {profileForm.fullname}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên đăng nhập
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={profileForm.username}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vai trò
                      </label>
                      <input
                        type="text"
                        name="roleid"
                        value={
                          roleMap[profileForm.roleid] || profileForm.roleid
                        }
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Số điện thoại
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Địa chỉ
                      </label>
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
                  {formError && (
                    <div className="text-red-600 text-sm mt-2">{formError}</div>
                  )}
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
      )}
      {/* Ban Account Tab */}
      {activeTab === "ban" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium mb-4">
            Quản lý tài khoản người dùng
          </h3>
          {/* Search and Filter */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, email hoặc username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-400" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả vai trò</option>
                <option value="1">Quản trị viên</option>
                <option value="2">Giáo viên</option>
                <option value="3">Phụ huynh</option>
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="banned">Đã khóa</option>
              </select>
            </div>
          </div>
          {/* User Accounts Table */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      STT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên đăng nhập
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Họ và tên
                        <FaSort className="ml-1 text-gray-400" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("role")}
                    >
                      <div className="flex items-center">
                        Vai trò
                        <FaSort className="ml-1 text-gray-400" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center">
                        Trạng thái
                        <FaSort className="ml-1 text-gray-400" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        {searchTerm || selectedRole
                          ? "Không tìm thấy tài khoản nào phù hợp"
                          : "Không có tài khoản nào"}
                      </td>
                    </tr>
                  ) : (
                    sortedUsers.map((userAccount, index) => (
                      <tr key={userAccount.userId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {userAccount.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {userAccount.fullname}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {userAccount.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              userAccount.roleid === 1
                                ? "bg-red-100 text-red-800"
                                : userAccount.roleid === 2
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {roleMap[userAccount.roleid] || "Unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              userAccount.status
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {userAccount.status ? "Hoạt động" : "Đã khóa"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {userAccount.userId !== user?.userId &&
                            (userAccount.status ? (
                              <button
                                onClick={() => handleBanUser(userAccount)}
                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                              >
                                <FaBan className="inline mr-1" />
                                Khóa
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnbanUser(userAccount)}
                                className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-md transition-colors"
                              >
                                <FaUnlock className="inline mr-1" />
                                Mở khóa
                              </button>
                            ))}
                          {userAccount.userId === user?.userId && (
                            <span className="text-gray-400">
                              Tài khoản hiện tại
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Ban/Unban Confirmation Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div
                className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${
                  userToBan?.action === "ban" ? "bg-red-100" : "bg-green-100"
                }`}
              >
                {userToBan?.action === "ban" ? (
                  <FaBan className="h-6 w-6 text-red-600" />
                ) : (
                  <FaUnlock className="h-6 w-6 text-green-600" />
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                {userToBan?.action === "ban"
                  ? "Xác nhận khóa tài khoản"
                  : "Xác nhận mở khóa tài khoản"}
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Bạn có chắc chắn muốn{" "}
                  {userToBan?.action === "ban" ? "khóa" : "mở khóa"} tài khoản
                  của <strong>{userToBan?.fullname}</strong>?
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {userToBan?.action === "ban"
                    ? "Tài khoản này sẽ không thể đăng nhập cho đến khi được mở khóa."
                    : "Tài khoản này sẽ có thể đăng nhập lại bình thường."}
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() => setShowBanModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <FaTimes className="inline mr-1" />
                  Hủy
                </button>
                <button
                  onClick={confirmBanUser}
                  disabled={isBanning}
                  className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 ${
                    userToBan?.action === "ban"
                      ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                      : "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                  }`}
                >
                  {isBanning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      {userToBan?.action === "ban" ? (
                        <>
                          <FaBan className="inline mr-1" />
                          Khóa tài khoản
                        </>
                      ) : (
                        <>
                          <FaUnlock className="inline mr-1" />
                          Mở khóa tài khoản
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal đổi mật khẩu */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
              onClick={() => {
                setShowChangePasswordModal(false);
                setFormError("");
                setProfileForm((prev) => ({
                  ...prev,
                  currentPassword: "",
                  password: "",
                  confirmPassword: "",
                }));
              }}
              aria-label="Đóng"
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4 text-center">
              Đổi mật khẩu
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
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
              {formError && (
                <div className="text-red-600 text-sm mt-2">{formError}</div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setFormError("");
                    setProfileForm((prev) => ({
                      ...prev,
                      currentPassword: "",
                      password: "",
                      confirmPassword: "",
                    }));
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={!profileForm.currentPassword || !profileForm.password || !profileForm.confirmPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
                >
                  <FaSave className="inline mr-2" />
                  Đổi mật khẩu
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

export default AdminSetting;
