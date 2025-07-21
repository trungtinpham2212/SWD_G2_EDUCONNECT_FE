import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaGraduationCap, FaSignInAlt, FaSpinner, FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API_URL from '../config/api';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;


const Login = ({ setUser }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/user-accounts/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const data = await response.json();
        const userData = {
          token: data.token,
          userName: data.userName,
          email: data.email,
          roleId: data.roleId,
          userId: data.userId,
          teacherId: data.teacherId
        };
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        toast.success('Đăng nhập thành công!');
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        // Handle different error status codes
        if (response.status === 403) {
          toast.error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
        } else if (response.status === 401) {
          toast.error('Tên đăng nhập hoặc mật khẩu không đúng');
        } else if (response.status === 400) {
          toast.error('Dữ liệu đăng nhập không hợp lệ');
        } else if (response.status >= 500) {
          toast.error('Lỗi hệ thống. Vui lòng thử lại sau');
        } else {
          toast.error('Có lỗi xảy ra khi đăng nhập');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/user-accounts/login-google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenId: credentialResponse.credential })
      });

      if (response.ok) {
        const data = await response.json();
        const userData = {
          token: data.token,
          userName: data.userName,
          email: data.email,
          roleId: data.roleId,
          userId: data.userId,
          teacherId: data.teacherId
        };
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        toast.success('Đăng nhập Google thành công!');
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        toast.error('Đăng nhập Google thất bại!');
      }
    } catch (err) {
      console.error('Google login error:', err);
      toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 space-y-8 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-100 rounded-full opacity-50"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-50 rounded-full opacity-50"></div>

          <div className="relative">
            <div className="flex justify-center mb-6">
              <FaGraduationCap className="text-6xl text-blue-600" />
            </div>
            <h1 className="text-center text-3xl font-bold">
              <span className="text-blue-600">Edu</span>
              <span className="text-gray-800">Connect</span>
            </h1>
            <h2 className="mt-4 text-center text-xl font-medium text-gray-700">
              Đăng nhập vào hệ thống
            </h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              Vui lòng đăng nhập để tiếp tục
            </p>
          </div>
          {/* Nút Google Login */}
          <div className="flex justify-center my-2">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={() => toast.error('Đăng nhập Google thất bại!')}
              width="100%"
              useOneTap
              disabled={isLoading}
            />
          </div>
          {/* Hoặc */}
          <div className="flex items-center my-2">
            <div className="flex-grow h-px bg-gray-300"></div>
            <span className="mx-2 text-gray-400 text-xs">hoặc</span>
            <div className="flex-grow h-px bg-gray-300"></div>
          </div>
          
          <form className="mt-8 space-y-6 relative" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={credentials.username}
                  onChange={handleChange}
                  placeholder="Tên đăng nhập"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={credentials.password}
                  onChange={handleChange}
                  placeholder="Mật khẩu"
                  className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <span
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-400"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={0}
                  role="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200`}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {isLoading ? (
                  <FaSpinner className="h-5 w-5 text-blue-300 animate-spin" />
                ) : (
                <FaSignInAlt className="h-5 w-5 text-blue-500 group-hover:text-blue-400" />
                )}
              </span>
              <span className="ml-3">{isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
            </button>
          </form>

          <div className="text-center text-sm">
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
              Quên mật khẩu?
            </a>
          </div>
        </div>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </div>
    </GoogleOAuthProvider>
  );
};

export default Login; 