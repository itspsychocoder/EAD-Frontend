'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../css/dashboard.module.css';
import { useUserStore } from '@/store/store';

export default function UsersPage() {
  const router = useRouter();
  const { username, role, setIsLoggedIn, setUsername, setRole } = useUserStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Create user form state
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    role: 'Student'
  });
  const [creating, setCreating] = useState(false);
  
  // Edit modal states
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '',
    password: '',
    role: ''
  });

  const verifyToken = async () => {
    const token = localStorage.getItem('mess_token');
    console.log("Verifying token:", token);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ Token: token })
      });

      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(true);
        setUsername(data.username);
        const storedRole = data.role || 'Student';
        setRole(storedRole);
        
        // Check if user is admin
        if (storedRole !== 'Admin') {
          router.push('/dashboard');
          return false;
        }
        return true;
      } else {
        localStorage.removeItem('mess_token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        router.push('/login');
        return false;
      }
    } catch (error) {
      console.error('Token verification error:', error);
      router.push('/login');
      return false;
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      const isValid = await verifyToken();
      if (isValid) {
        fetchUsers();
      }
    };
    initializePage();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('mess_token');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch users' });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'An error occurred while fetching users' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Username: createForm.username,
          Password: createForm.password
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // If we need to set the role (since signup creates Student by default)
        // We would need to update the user role if it's not Student
        if (createForm.role !== 'Student') {
          // Find the newly created user
          await fetchUsers();
          const newUser = users.find(u => u.username === createForm.username);
          if (newUser) {
            await updateUserRole(newUser.id, createForm.role);
          }
        }
        
        setMessage({ type: 'success', text: 'User created successfully!' });
        setCreateForm({
          username: '',
          password: '',
          role: 'Student'
        });
        fetchUsers();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ 
          type: 'error', 
          text: errorData.message || 'Failed to create user' 
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setMessage({ type: 'error', text: 'An error occurred while creating the user' });
    } finally {
      setCreating(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    const token = localStorage.getItem('mess_token');
    
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Auth/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        Role: newRole
      })
    });
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      password: '',
      role: user.role
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('mess_token');
      
      const updateData = {
        Username: editForm.username !== editingUser.username ? editForm.username : undefined,
        Password: editForm.password || undefined,
        Role: editForm.role !== editingUser.role ? editForm.role : undefined
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Auth/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'User updated successfully!' });
        setEditingUser(null);
        fetchUsers();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: errorData.message || 'Failed to update user' });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating the user' });
    }
  };

  const handleDelete = async (id, username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('mess_token');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Auth/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'User deleted successfully!' });
        fetchUsers();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: errorData.message || 'Failed to delete user' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: 'An error occurred while deleting the user' });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>User Management</h1>
        <p className={styles.subtitle}>Manage user accounts - {username} ({role})</p>
      </div>

      {message.text && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 20px',
          padding: '12px 20px',
          borderRadius: '5px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Create User Form */}
      <div className={styles.tableSection} style={{ marginBottom: '40px' }}>
        <h2 className={styles.tableTitle}>Create New User</h2>
        
        <form onSubmit={handleCreateUser} style={{ maxWidth: '600px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="username" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Username <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={createForm.username}
              onChange={handleCreateFormChange}
              placeholder="Enter username"
              required
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Password <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={createForm.password}
              onChange={handleCreateFormChange}
              placeholder="Enter password"
              required
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="role" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Role <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              id="role"
              name="role"
              value={createForm.role}
              onChange={handleCreateFormChange}
              required
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="Student">Student</option>
              <option value="Admin">Admin</option>
              <option value="Teacher">Teacher</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={creating}
            style={{
              padding: '12px 30px',
              background: creating ? '#ccc' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: creating ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>

      {/* Users List */}
      <div className={styles.tableSection}>
        <h2 className={styles.tableTitle}>All Users</h2>
        
        {loading ? (
          <p className={styles.loading}>Loading...</p>
        ) : users.length > 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: user.role === 'Admin' ? '#ffeaa7' : user.role === 'Teacher' ? '#74b9ff' : '#dfe6e9',
                        color: '#2d3436'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleEdit(user)}
                        style={{
                          padding: '5px 12px',
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginRight: '5px'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.username)}
                        style={{
                          padding: '5px 12px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.noData}>No users found</p>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>Edit User</h2>
            
            <form onSubmit={handleUpdateUser}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={editForm.username}
                  onChange={handleEditFormChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  name="password"
                  value={editForm.password}
                  onChange={handleEditFormChange}
                  placeholder="Enter new password"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                  Role
                </label>
                <select
                  name="role"
                  value={editForm.role}
                  onChange={handleEditFormChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="Student">Student</option>
                  <option value="Admin">Admin</option>
                  <option value="Teacher">Teacher</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
