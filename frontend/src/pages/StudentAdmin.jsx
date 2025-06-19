import React, { useState, useEffect } from 'react';
import { FaSearch, FaUserGraduate, FaBirthdayCake, FaUserFriends } from 'react-icons/fa';
import API_URL from '../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ITEMS_PER_PAGE = 8;

const StudentAdmin = () => {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState('all');
    const [parentAccounts, setParentAccounts] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [sortByClass, setSortByClass] = useState(true);
    const [form, setForm] = useState({
        name: '',
        dateofbirth: '',
        classid: '',
        parentid: ''
    });
    const [editingStudent, setEditingStudent] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);


    const fetchData = async () => {
        try {
            setLoading(true);
            const [studentRes, classRes, parentRes] = await Promise.all([
                fetch(`${API_URL}/api/Student`),
                fetch(`${API_URL}/api/Class`),
                fetch(`${API_URL}/api/UserAccount/GetAllUserAccounts`)
            ]);
            const studentData = await studentRes.json();
            const classData = await classRes.json();
            const parentData = await parentRes.json();
            setStudents(studentData);
            setClasses(classData);
            setParentAccounts(parentData);
            setError(null);
        } catch (err) {
            setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    const getClassName = (classid) => {
        const cls = classes.find(c => c.classid === classid);
        return cls ? cls.classname : `Lớp ${classid}`;
    };

    const filteredStudents = students
        .filter(student =>
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (selectedClass === 'all' || student.classid === Number(selectedClass))
        )
        .sort((a, b) => {
            if (sortByClass) {
                const classA = getClassName(a.classid);
                const classB = getClassName(b.classid);
                if (classA === classB) {
                    // Nếu cùng lớp thì sort theo tên
                    return a.name.localeCompare(b.name, 'vi');
                }
                return classA.localeCompare(classB, 'vi');
            }
            return 0;
        });

    const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
    const paginatedStudents = filteredStudents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    const handleOpenModal = (student = null) => {
        if (student) {
            setForm({
                name: student.name,
                dateofbirth: student.dateofbirth ? student.dateofbirth.split('T')[0] : '',
                classid: student.classid || '',
                parentid: student.parentid || ''
            });
            setEditingStudent(student);
        } else {
            setForm({ name: '', dateofbirth: '', classid: '', parentid: '' });
            setEditingStudent(null);
        }
        setShowModal(true);
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingStudent) {
                // Sửa học sinh
                const response = await fetch(`${API_URL}/api/Student/${editingStudent.studentid}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form)
                });
                if (response.ok) {
                    await fetchData();
                    setShowModal(false);
                    toast.success('Cập nhật học sinh thành công!');
                } else {
                    const text = await response.text();
                    toast.error('Có lỗi khi cập nhật: ' + text);
                }
            } else {
                // Tạo mới
                const response = await fetch(`${API_URL}/api/Student`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form)
                });
                if (response.ok) {
                    await fetchData();
                    setShowModal(false);
                    toast.success('Tạo học sinh thành công!');
                } else {
                    const text = await response.text();
                    toast.error('Có lỗi khi tạo: ' + text);
                }
            }
        } catch (error) {
            toast.error('Có lỗi khi lưu học sinh.');
        }
    };

    const handleDelete = (studentid) => {
        setStudentToDelete(studentid);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            const response = await fetch(`${API_URL}/api/Student/${studentToDelete}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await fetchData();
                toast.success('Xóa học sinh thành công!');
            } else {
                const text = await response.text();
                toast.error('Có lỗi khi xóa: ' + text);
            }
        } catch (error) {
            toast.error('Có lỗi khi xóa học sinh.');
        } finally {
            setShowDeleteModal(false);
            setStudentToDelete(null);
        }
    };

    return (
        <div className="flex-1 p-4 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <FaUserGraduate className="text-3xl text-blue-600 mr-3" />
                    <h2 className="text-2xl font-semibold text-gray-800">Quản lý học sinh</h2>
                </div>
                <div className="flex items-center gap-4">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => handleOpenModal()}>Thêm học sinh</button>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Tìm kiếm học sinh..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                        />
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                </div>
            </div>
            {loading ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Đang tải danh sách học sinh...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và tên</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày sinh</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={selectedClass}
                                                onChange={(e) => {
                                                    setSelectedClass(e.target.value);
                                                    setCurrentPage(1);
                                                }}
                                                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                            >
                                                <option value="all">LỚP</option>
                                                {classes.map(cls => (
                                                    <option key={cls.classid} value={cls.classid}>
                                                        {cls.classname}
                                                    </option>
                                                ))}
                                            </select>
                                            {/* <span 
                                                className="cursor-pointer"
                                                onClick={() => setSortByClass(!sortByClass)}
                                            >
                                                {sortByClass ? '▼' : '▲'}
                                            </span> */}
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phụ huynh</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">Không tìm thấy học sinh nào</td>
                                    </tr>
                                ) : (
                                    paginatedStudents.map((student, index) => (
                                        <tr key={student.studentid} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <FaUserGraduate className="text-blue-600" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                        <div className="text-sm text-gray-500">ID: {student.studentid}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <FaBirthdayCake className="text-pink-500 mr-2" />
                                                    <span className="text-sm text-gray-900">{formatDate(student.dateofbirth)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{getClassName(student.classid)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <FaUserFriends className="text-gray-500 mr-2" />
                                                    <span className="text-sm text-gray-900">
                                                        {(() => {
                                                            const parent = parentAccounts.find(acc => acc.userid === student.parentid);
                                                            return parent ? (
                                                                <span>
                                                                    <b>{parent.fullname}</b><br />
                                                                    Email: {parent.email || 'Không có'}<br />
                                                                    SDT: {parent.phonenumber || 'Không có'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">Chưa có thông tin</span>
                                                            );
                                                        })()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 mr-2" onClick={() => handleOpenModal(student)}>Sửa</button>
                                                <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700" onClick={() => handleDelete(student.studentid)}>Xóa</button>
                                            </td>
                                        </tr>
                                    ))
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
                </div>
            )}
            <ToastContainer />
            {/* Modal CRUD học sinh */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-4">{editingStudent ? 'Sửa học sinh' : 'Thêm học sinh mới'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                                <input type="text" name="name" value={form.name} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Ngày sinh</label>
                                <input type="date" name="dateofbirth" value={form.dateofbirth} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Lớp</label>
                                <select name="classid" value={form.classid} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                    <option value="">-- Chọn lớp --</option>
                                    {classes.map(cls => (
                                        <option key={cls.classid} value={cls.classid}>{cls.classname}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Phụ huynh</label>
                                <select name="parentid" value={form.parentid} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                    <option value="">-- Chọn phụ huynh --</option>
                                    {parentAccounts.filter(p => p.roleid === 3).map(p => (
                                        <option key={p.userid} value={p.userid}>{p.fullname} ({p.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end mt-6">
                                <button type="button" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700 mr-2" onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal xác nhận xóa */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Xác nhận xóa học sinh</h3>
                        <p>Bạn có chắc chắn muốn xóa học sinh này không?</p>
                        <div className="flex justify-end mt-6 gap-2">
                            <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700" onClick={() => setShowDeleteModal(false)}>Hủy</button>
                            <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" onClick={confirmDelete}>Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentAdmin;
