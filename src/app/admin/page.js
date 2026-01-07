'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../css/dashboard.module.css';
import { useUserStore } from '@/store/store';

export default function AdminPage() {
  const router = useRouter();
  const { username, role, setIsLoggedIn, setUsername, setRole } = useUserStore();
  
  // Food form state
  const [foodForm, setFoodForm] = useState({
    date: '',
    mealType: 'Breakfast',
    itemName: '',
    cost: ''
  });
  const [foodSubmitting, setFoodSubmitting] = useState(false);
  const [foodMessage, setFoodMessage] = useState({ type: '', text: '' });

  const verifyToken = async () => {
    const token = localStorage.getItem('mess_token');
    
    if (!token) {
      router.push('/login');
      return false;
    }

    try {
      const response = await fetch('http://localhost:56325/api/Auth/verify', {
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
    verifyToken();
  }, []);

  const handleFoodFormChange = (e) => {
    const { name, value } = e.target;
    setFoodForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFoodSubmit = async (e) => {
    e.preventDefault();
    setFoodSubmitting(true);
    setFoodMessage({ type: '', text: '' });

    try {
      // Get the token from localStorage
      const token = localStorage.getItem('mess_token');
      
      if (!token) {
        setFoodMessage({ type: 'error', text: 'Authentication token not found. Please login again.' });
        setFoodSubmitting(false);
        return;
      }

      // Prepare the data (PascalCase for C# backend)
      const foodData = {
        Date: foodForm.date,
        MealType: foodForm.mealType,
        ItemName: foodForm.itemName,
        Cost: parseFloat(foodForm.cost)
      };

      // Make the API call
      const response = await fetch('/api/Food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(foodData)
      });

      if (response.ok) {
        setFoodMessage({ type: 'success', text: 'Food item added successfully!' });
        // Reset form
        setFoodForm({
          date: '',
          mealType: 'Breakfast',
          itemName: '',
          cost: ''
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setFoodMessage({ 
          type: 'error', 
          text: errorData.message || `Failed to add food item. Status: ${response.status}` 
        });
      }
    } catch (error) {
      console.error('Error adding food:', error);
      setFoodMessage({ type: 'error', text: 'An error occurred while adding the food item.' });
    } finally {
      setFoodSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Panel</h1>
        <p className={styles.subtitle}>Welcome {username} - {role}</p>
      </div>

      <div className={styles.tableSection}>
        <h2 className={styles.tableTitle}>Add Food Item</h2>
        
        {foodMessage.text && (
          <div style={{
            padding: '12px 20px',
            marginBottom: '20px',
            borderRadius: '5px',
            backgroundColor: foodMessage.type === 'success' ? '#d4edda' : '#f8d7da',
            color: foodMessage.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${foodMessage.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {foodMessage.text}
          </div>
        )}

        <form onSubmit={handleFoodSubmit} style={{ maxWidth: '600px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="date" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Date <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={foodForm.date}
              onChange={handleFoodFormChange}
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
            <label htmlFor="mealType" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Meal Type <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              id="mealType"
              name="mealType"
              value={foodForm.mealType}
              onChange={handleFoodFormChange}
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

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="itemName" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Item Name <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              id="itemName"
              name="itemName"
              value={foodForm.itemName}
              onChange={handleFoodFormChange}
              maxLength={500}
              placeholder="Enter food item name"
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
            <label htmlFor="cost" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Cost (Rs.) <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="number"
              id="cost"
              name="cost"
              value={foodForm.cost}
              onChange={handleFoodFormChange}
              min="0"
              max="10000"
              step="0.01"
              placeholder="Enter cost"
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

          <button
            type="submit"
            disabled={foodSubmitting}
            style={{
              padding: '12px 30px',
              background: foodSubmitting ? '#ccc' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: foodSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {foodSubmitting ? 'Adding...' : 'Add Food Item'}
          </button>
        </form>
      </div>
    </div>
  );
}
