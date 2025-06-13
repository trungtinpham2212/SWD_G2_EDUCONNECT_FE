import { Navigate } from 'react-router-dom';
import Login from "../components/Login";
import Dashboard from "../pages/Dashboard";
import TeacherManagement from "../pages/TeacherManagement";
import ParentManagement from "../pages/ParentManagement";
import StudentManagement from "../pages/StudentManagement";
import SchoolYearManagement from "../pages/SchoolYearManagement";
import SubjectManagement from "../pages/SubjectManagement";
import ClassManagement from "../pages/ClassManagement";
import SessionManagement from "../pages/SessionManagement";
import EvaluationManagement from "../pages/EvaluationManagement";
import ReportManagement from "../pages/ReportManagement";
import ActivityLog from "../pages/ActivityLog";
import Setting from "../pages/Setting";
import Schedule from "../pages/Schedule";
import Sidebar from "../components/Sidebar";
import SectionDetail from "../pages/SectionDetail";
import StudentAdmin from '../pages/StudentAdmin';
import EvaluationAdmin from '../pages/EvaluationAdmin';

// Layout component for protected routes
const ProtectedLayout = ({ element: Component, allowedRoles, user, ...props }) => {
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(user.roleId)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar
        active={props.active}
        setActive={props.setActive}
        isOpen={props.isSidebarOpen}
        setIsOpen={props.setSidebarOpen}
        user={user}
      />
      <Component {...props} user={user} />
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
    // Dashboard - accessible by all roles
    {
      path: "/dashboard",
      element: <ProtectedLayout 
        element={Dashboard}
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
      path: "/settings",
      element: <ProtectedLayout 
        element={Setting}
        allowedRoles={[1]}
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
      path: "/section/:sectionid",
      element: <ProtectedLayout 
        element={SectionDetail}
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
    // Default route
    {
      path: "/",
      element: <Navigate to="/dashboard" />
    }
  ];
};
