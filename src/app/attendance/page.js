'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../css/dashboard.module.css';
import { useUserStore } from '@/store/store';

export default function AttendancePage() {
  const router = useRouter();
  const { username, role, setIsLoggedIn, setUsername, setRole } = useUserStore();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  
  // Mark attendance form state
  const [markForm, setMarkForm] = useState({
    userId: '',
    foodId: ''
  });
  const [marking, setMarking] = useState(false);
  
  // Water charge form state
  const [waterForm, setWaterForm] = useState({
    date: '',
    waterCharge: ''
  });
  const [chargingWater, setChargingWater] = useState(false);

  const verifyToken = async () => {
    const token = localStorage.getItem('mess_token');
    
    if (!token) {
      router.push('/login');
      return false;
    }

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
        fetchFoods();
        fetchAttendance();
      }
    };
    initializePage();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('mess_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchFoods = async () => {
    try {
      const token = localStorage.getItem('mess_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Food`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setFoods(data);
      }
    } catch (error) {
      console.error('Error fetching foods:', error);
    }
  };

  const fetchAttendance = async (start = null, end = null, userId = null) => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('mess_token');
      let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/FoodAttendance`;
      const params = new URLSearchParams();
      
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);
      if (userId) params.append('userId', userId);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data.attendance || []);
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch attendance records' });
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setMessage({ type: 'error', text: 'An error occurred while fetching attendance' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchAttendance(startDate || null, endDate || null, selectedUserId || null);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setSelectedUserId('');
    fetchAttendance();
  };

  const handleMarkFormChange = (e) => {
    const { name, value } = e.target;
    setMarkForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    setMarking(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('mess_token');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/FoodAttendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          UserId: parseInt(markForm.userId),
          FoodId: parseInt(markForm.foodId)
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Attendance marked successfully!' });
        setMarkForm({ userId: '', foodId: '' });
        fetchAttendance(startDate || null, endDate || null, selectedUserId || null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: errorData.message || 'Failed to mark attendance' });
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      setMessage({ type: 'error', text: 'An error occurred while marking attendance' });
    } finally {
      setMarking(false);
    }
  };

  const handleWaterFormChange = (e) => {
    const { name, value } = e.target;
    setWaterForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChargeWater = async (e) => {
    e.preventDefault();
    setChargingWater(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('mess_token');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/FoodAttendance/water-charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          Date: waterForm.date,
          WaterCharge: parseFloat(waterForm.waterCharge)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ 
          type: 'success', 
          text: `Water charge added! ${data.recordsUpdated} records updated for ${data.usersAffected} users.` 
        });
        setWaterForm({ date: '', waterCharge: '' });
        fetchAttendance(startDate || null, endDate || null, selectedUserId || null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: errorData.message || 'Failed to add water charge' });
      }
    } catch (error) {
      console.error('Error adding water charge:', error);
      setMessage({ type: 'error', text: 'An error occurred while adding water charge' });
    } finally {
      setChargingWater(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }

    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('mess_token');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/FoodAttendance/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Attendance record deleted successfully!' });
        fetchAttendance(startDate || null, endDate || null, selectedUserId || null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: errorData.message || 'Failed to delete record' });
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      setMessage({ type: 'error', text: 'An error occurred while deleting the record' });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const totalCost = attendanceRecords.reduce((sum, record) => sum + record.totalCost, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Attendance Management</h1>
        <p className={styles.subtitle}>Mark meal attendance and water charges - {username} ({role})</p>
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

      {/* Mark Attendance Form */}
      <div className={styles.tableSection} style={{ marginBottom: '20px' }}>
        <h2 className={styles.tableTitle}>Mark Meal Attendance</h2>
        
        <form onSubmit={handleMarkAttendance} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
              User <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              name="userId"
              value={markForm.userId}
              onChange={handleMarkFormChange}
              required
              style={{
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                outline: 'none',
                backgroundColor: 'white',
                minWidth: '200px'
              }}
            >
              <option value="">Select User</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
              Meal <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              name="foodId"
              value={markForm.foodId}
              onChange={handleMarkFormChange}
              required
              style={{
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                outline: 'none',
                backgroundColor: 'white',
                minWidth: '300px'
              }}
            >
              <option value="">Select Meal</option>
              {foods.map(food => (
                <option key={food.id} value={food.id}>
                  {formatDate(food.date)} - {food.mealType} - {food.itemName} (Rs. {food.cost})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={marking}
            style={{
              padding: '10px 20px',
              background: marking ? '#ccc' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: marking ? 'not-allowed' : 'pointer'
            }}
          >
            {marking ? 'Marking...' : 'Mark Attendance'}
          </button>
        </form>
      </div>

      {/* Water Charge Form */}
      <div className={styles.tableSection} style={{ marginBottom: '20px' }}>
        <h2 className={styles.tableTitle}>Add Water Charge (All Users for Date)</h2>
        
        <form onSubmit={handleChargeWater} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
              Date <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="date"
              name="date"
              value={waterForm.date}
              onChange={handleWaterFormChange}
              required
              style={{
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
              Water Charge (Rs.) <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="number"
              name="waterCharge"
              value={waterForm.waterCharge}
              onChange={handleWaterFormChange}
              min="0"
              step="0.01"
              placeholder="Enter amount"
              required
              style={{
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                outline: 'none',
                minWidth: '150px'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={chargingWater}
            style={{
              padding: '10px 20px',
              background: chargingWater ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: chargingWater ? 'not-allowed' : 'pointer'
            }}
          >
            {chargingWater ? 'Adding...' : 'Add Water Charge'}
          </button>
        </form>
      </div>

      {/* Filter Section */}
      <div className={styles.tableSection} style={{ marginBottom: '20px' }}>
        <h2 className={styles.tableTitle}>Filter Attendance Records</h2>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                outline: 'none'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                outline: 'none'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
              User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                outline: 'none',
                backgroundColor: 'white',
                minWidth: '150px'
              }}
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleFilter}
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
            Apply Filter
          </button>
          <button
            onClick={handleClearFilter}
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
            Clear
          </button>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className={styles.tableSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className={styles.tableTitle} style={{ margin: 0 }}>Attendance Records</h2>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#10b981' }}>
            Total: Rs. {totalCost.toFixed(2)}
          </div>
        </div>
        
        {loading ? (
          <p className={styles.loading}>Loading...</p>
        ) : attendanceRecords.length > 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Meal Type</th>
                  <th>Item</th>
                  <th>Food Cost</th>
                  <th>Water Charge</th>
                  <th>Total Cost</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td>{record.username}</td>
                    <td>{record.mealType}</td>
                    <td>{record.itemName}</td>
                    <td>Rs. {record.foodCost}</td>
                    <td>Rs. {record.waterCharge}</td>
                    <td className={styles.cost}>Rs. {record.totalCost}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(record.id)}
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
          <p className={styles.noData}>No attendance records found</p>
        )}
      </div>
    </div>
  );
}
