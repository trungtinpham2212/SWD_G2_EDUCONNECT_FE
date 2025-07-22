// Authentication utilities
export const getTokenFromStorage = () => {
  // Thử lấy token trực tiếp
  let token = localStorage.getItem('token');
  
  // Nếu không có, thử parse từ user object
  if (!token) {
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        token = user.token;
      }
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
    }
  }
  
  return token;
};

export const getAuthHeaders = () => {
  const token = getTokenFromStorage();
  
  if (!token) {
    return {};
  }
  return { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const isAuthenticated = () => {
  return !!getTokenFromStorage();
};

export const removeToken = () => {
  localStorage.removeItem('token');
  // Optionally clear user data too
  localStorage.removeItem('user');
}; 