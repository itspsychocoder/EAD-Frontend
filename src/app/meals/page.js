'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../css/dashboard.module.css';
import { useUserStore } from '@/store/store';

export default function MealsPage() {
  const router = useRouter();
  const { username, role, setIsLoggedIn, setUsername, setRole } = useUserStore();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Edit modal states
  const [editingMeal, setEditingMeal] = useState(null);
  const [editForm, setEditForm] = useState({
    date: '',
    mealType: '',
    itemName: '',
    cost: ''
  });

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
        const storedRole = localStorage.getItem('role') || 'Student';
        setRole(storedRole);
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
        fetchMeals();
      }
    };
    initializePage();
  }, []);

  const fetchMeals = async (start = null, end = null) => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('mess_token');
      if (!token) {
        setMessage({ type: 'error', text: 'Please login to view meals' });
        setLoading(false);
        return;
      }

      let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/Food`;
      const params = new URLSearchParams();
      
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMeals(data);
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch meals' });
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
      setMessage({ type: 'error', text: 'An error occurred while fetching meals' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchMeals(startDate || null, endDate || null);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    fetchMeals();
  };

  const handleEdit = (meal) => {
    setEditingMeal(meal);
    setEditForm({
      date: meal.date.split('T')[0],
      mealType: meal.mealType,
      itemName: meal.itemName,
      cost: meal.cost.toString()
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateMeal = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('mess_token');
      
      const updateData = {
        Date: editForm.date,
        MealType: editForm.mealType,
        ItemName: editForm.itemName,
        Cost: parseFloat(editForm.cost)
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Food/${editingMeal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Meal updated successfully!' });
        setEditingMeal(null);
        fetchMeals(startDate || null, endDate || null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: errorData.message || 'Failed to update meal' });
      }
    } catch (error) {
      console.error('Error updating meal:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating the meal' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this meal?')) {
      return;
    }

    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('mess_token');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Food/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Meal deleted successfully!' });
        fetchMeals(startDate || null, endDate || null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: errorData.message || 'Failed to delete meal' });
      }
    } catch (error) {
      console.error('Error deleting meal:', error);
      setMessage({ type: 'error', text: 'An error occurred while deleting the meal' });
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Meals Management</h1>
        <p className={styles.subtitle}>View and manage all meals - {username} ({role})</p>
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

      <div className={styles.tableSection} style={{ marginBottom: '20px' }}>
        <h2 className={styles.tableTitle}>Filter Meals</h2>
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

      <div className={styles.tableSection}>
        <h2 className={styles.tableTitle}>All Meals</h2>
        
        {loading ? (
          <p className={styles.loading}>Loading...</p>
        ) : meals.length > 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Meal Type</th>
                  <th>Item Name</th>
                  <th>Cost</th>
                  <th>Added By</th>
                  {role === 'Admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {meals.map((meal) => (
                  <tr key={meal.id}>
                    <td>{formatDate(meal.date)}</td>
                    <td>{meal.mealType}</td>
                    <td>{meal.itemName}</td>
                    <td className={styles.cost}>Rs. {meal.cost}</td>
                    <td>{meal.createdByUsername}</td>
                    {role === 'Admin' && (
                      <td>
                        <button
                          onClick={() => handleEdit(meal)}
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
                          onClick={() => handleDelete(meal.id)}
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
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.noData}>No meals found</p>
        )}
      </div>

      {/* Edit Modal */}
      {editingMeal && (
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
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>Edit Meal</h2>
            
            <form onSubmit={handleUpdateMeal}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={editForm.date}
                  onChange={handleEditFormChange}
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

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                  Meal Type
                </label>
                <select
                  name="mealType"
                  value={editForm.mealType}
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
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                  Item Name
                </label>
                <input
                  type="text"
                  name="itemName"
                  value={editForm.itemName}
                  onChange={handleEditFormChange}
                  maxLength={500}
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
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                  Cost (Rs.)
                </label>
                <input
                  type="number"
                  name="cost"
                  value={editForm.cost}
                  onChange={handleEditFormChange}
                  min="0"
                  max="10000"
                  step="0.01"
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

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingMeal(null)}
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
                  Update Meal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
