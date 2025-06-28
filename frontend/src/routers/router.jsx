import { Navigate } from 'react-router-dom';
import Login from "../components/Login";
import ParentDashboard from "../pages/Parent/ParentDashboard";
import AdminDashboard from "../pages/Admin/AdminDashboard";
import TeacherDashboard from "../pages/Teacher/TeacherDashboard";
import TeacherManagement from "../pages/Admin/TeacherManagement";
import ParentManagement from "../pages/Admin/ParentManagement";
import StudentManagement from "../pages/Teacher/StudentManagement";
import SchoolYearManagement from "../pages/Admin/SchoolYearManagement";
import SubjectManagement from "../pages/Admin/SubjectManagement";
import ClassManagement from "../pages/Admin/ClassManagement";
import SessionManagement from "../pages/Admin/SessionManagement";
import EvaluationManagement from "../pages/Teacher/EvaluationManagement";
import ReportManagement from "../pages/Teacher/ReportManagement";
import ActivityLog from "../pages/Admin/ActivityLog";
import AdminSetting from "../pages/Admin/AdminSetting";
import Schedule from "../pages/Teacher/Schedule";
import Sidebar from "../components/Sidebar";
import SessionDetail from "../pages/Teacher/SessionDetail";
import StudentAdmin from '../pages/Admin/StudentAdmin';
import EvaluationAdmin from '../pages/Admin/EvaluationAdmin';
import ReportAdmin from '../pages/Admin/ReportAdmin';
import TeacherSetting from '../pages/Teacher/TeacherSetting';
import ReportTeacher from '../pages/Teacher/ReportManagement';
import ParentSetting from '../pages/Parent/ParentSetting';
import Chatbot from '../pages/Parent/Chatbot';
// Dynamic Dashboard component that renders based on user role
const DynamicDashboard = ({ user, ...props }) => {
  if (!user) return null;
  
  switch (user.roleId) {
    case 1: // Admin
      return <AdminDashboard user={user} {...props} />;
    case 2: // Teacher
      return <TeacherDashboard user={user} {...props} />;
    case 3: // Parent
      return <ParentDashboard user={user} {...props} />;
    default:
      return <ParentDashboard user={user} {...props} />;
  }
};

// Layout component for protected routes
const ProtectedLayout = ({ element: Component, allowedRoles, user, ...props }) => {
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(user.roleId)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-shrink-0">
        <Sidebar
          active={props.active}
          setActive={props.setActive}
          isOpen={props.isSidebarOpen}
          setIsOpen={props.setSidebarOpen}
          user={user}
        />
      </div>
      <div className="flex-1 flex flex-col h-screen min-w-0">
        <Component {...props} user={user} />
      </div>
    </div>
  );
};

export const createRoutes = ({ user, active, setActive, isSidebarOpen, setSidebarOpen, handleSetUser }) => {
  const commonProps = {
    user,
    active,
    setActive,
    isSidebarOpen,
    setSidebarOpen
  };

  return [
    {
      path: "/login",
      element: <Login setUser={handleSetUser} />
    },
    // Dashboard - accessible by all roles, renders appropriate dashboard based on role
    {
      path: "/dashboard",
      element: <ProtectedLayout 
        element={DynamicDashboard}
        allowedRoles={[1, 2, 3]}
        {...commonProps}
      />
    },
    // Admin only routes (roleId: 1)
    {
      path: "/teachers",
      element: <ProtectedLayout 
        element={TeacherManagement}
        allowedRoles={[1]}
        {...commonProps}
      />
    },
    {
      path: "/parents",
      element: <ProtectedLayout 
        element={ParentManagement}
        allowedRoles={[1]}
        {...commonProps}
      />
    },
    {
      path: "/students",
      element: <ProtectedLayout 
        element={StudentManagement}
        allowedRoles={[1, 2]} // Both Admin and Teachers can access
        {...commonProps}
      />
    },
    {
      path: "/school-years",
      element: <ProtectedLayout 
        element={SchoolYearManagement}
        allowedRoles={[1]}
        {...commonProps}
      />
    },
    {
      path: "/subjects",
      element: <ProtectedLayout 
        element={SubjectManagement}
        allowedRoles={[1]}
        {...commonProps}
      />
    },
    {
      path: "/classes",
      element: <ProtectedLayout 
        element={ClassManagement}
        allowedRoles={[1]}
        {...commonProps}
      />
    },
    {
      path: "/sessions",
      element: <ProtectedLayout 
        element={SessionManagement}
        allowedRoles={[1]}
        {...commonProps}
      />
    },
    {
      path: "/evaluations",
      element: <ProtectedLayout 
        element={EvaluationManagement}
        allowedRoles={[1,2]}
        {...commonProps}
      />
    },
    {
      path: "/reports",
      element: <ProtectedLayout 
        element={ReportManagement}
        allowedRoles={[1, 2]} // Both Admin and Teachers can access
        {...commonProps}
      />
    },
    {
      path: "/activity-logs",
      element: <ProtectedLayout 
        element={ActivityLog}
        allowedRoles={[1]}
        {...commonProps}
      />
    },
    {
      path: "/admin/settings",
      element: <ProtectedLayout 
        element={AdminSetting}
        allowedRoles={[1]}
        {...commonProps}
      />
    },
    {
      path: "/teacher/settings",
      element: <ProtectedLayout 
        element={TeacherSetting}
        allowedRoles={[2]}
        {...commonProps}
      />
    },
    {
      path: "/parent/settings",
      element: <ProtectedLayout 
        element={ParentSetting}
        allowedRoles={[3]}
        {...commonProps}
      />
    },
    {
      path: "/teaching-schedule",
      element: <ProtectedLayout 
        element={Schedule}
        allowedRoles={[2]} // Only Teachers can access
        {...commonProps}
      />
    },
    {
      path: "/session/:sessionid",
      element: <ProtectedLayout 
        element={SessionDetail}
        allowedRoles={[1,2]}
        {...commonProps}
      />
    },
    {
      path: "/admin/students",
      element: <ProtectedLayout 
        element={StudentAdmin}
        allowedRoles={[1]}
        {...commonProps}
      />
    },
    {
      path: "/admin/evaluations",
      element: <ProtectedLayout 
        element={EvaluationAdmin}
        allowedRoles={[1]}
        {...commonProps}
      />
    },
    {
      path: "/admin/reports",
      element: <ProtectedLayout 
        element={ReportAdmin}
        allowedRoles={[1]}
        {...commonProps}
      />
    },
    {
      path: "/teacher/settings",
      element: <ProtectedLayout 
        element={TeacherSetting}
        allowedRoles={[2]}
        {...commonProps}
      />
    },
    {
      path: "/teacher/reports",
      element: <ProtectedLayout 
        element={ReportTeacher}
        allowedRoles={[2]}
        {...commonProps}
      />
    },
    {
      path: "/chatbot",
      element: <ProtectedLayout 
        element={Chatbot}
        allowedRoles={[3]}
        {...commonProps}
      />
    },
    // Default route
    {
      path: "/",
      element: <Navigate to="/dashboard" />
    }
  ];
};
