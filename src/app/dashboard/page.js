'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../css/dashboard.module.css';
import { useUserStore } from '@/store/store';

export default function DashboardPage() {
  const router = useRouter();
  const [mealHistory, setMealHistory] = useState([]);
  const [currentBill, setCurrentBill] = useState(0);
  const [loading, setLoading] = useState(true);
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
  const [selectedDate, setSelectedDate] = useState('');
  
  // Edit modal states
  const [editingMeal, setEditingMeal] = useState(null);
  const [editForm, setEditForm] = useState({
    date: '',
    mealType: '',
    itemName: '',
    cost: ''
  });

  // Student/Teacher balance and history states
  const [myBalance, setMyBalance] = useState(null);
  const [myHistory, setMyHistory] = useState([]);
  const [todayMeals, setTodayMeals] = useState([]);
  const [historyFilter, setHistoryFilter] = useState({
    type: 'month', // 'month' or 'range'
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    startDate: '',
    endDate: ''
  });
  
  // Payment states
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState({ type: '', text: '' });

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
        // Set store states from verification
        setIsLoggedIn(true);
        setUsername(data.username);
        const storedRole = data.role || 'Student';
        setRole(storedRole);
        return true;
      } else {
        // Token invalid, clear storage and redirect
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
        const storedRole = localStorage.getItem('role');
        if (storedRole === 'Admin') {
          fetchMealHistory();
        } else {
          // For Student/Teacher, fetch their balance and history
          fetchMyBalance();
          fetchMyHistory();
          fetchTodayMeals();
        }
      }
    };
    initializePage();
  }, []);

  const fetchMealHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('mess_token');
      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Food`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Transform the data to match the display format
        const transformedData = data.map(meal => ({
          id: meal.id,
          date: new Date(meal.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
          day: new Date(meal.date).toLocaleDateString('en-US', { weekday: 'long' }),
          meal: meal.mealType,
          cost: meal.cost,
          originalDate: meal.date.split('T')[0],
          itemName: meal.itemName
        }));
        setMealHistory(transformedData);
        setCurrentBill(transformedData.reduce((sum, item) => sum + item.cost, 0));
      } else {
        console.error('Failed to fetch meals');
      }
    } catch (error) {
      console.error('Error fetching meal history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMealsByDate = async (date) => {
    if (!date) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('mess_token');
      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Food/date/${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const transformedData = data.meals.map(meal => ({
          id: meal.id,
          date: new Date(meal.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
          day: new Date(meal.date).toLocaleDateString('en-US', { weekday: 'long' }),
          meal: meal.mealType,
          cost: meal.cost,
          originalDate: meal.date.split('T')[0],
          itemName: meal.itemName
        }));
        setMealHistory(transformedData);
        setCurrentBill(transformedData.reduce((sum, item) => sum + item.cost, 0));
      } else {
        console.error('Failed to fetch meals for date');
      }
    } catch (error) {
      console.error('Error fetching meals by date:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilter = () => {
    if (selectedDate) {
      fetchMealsByDate(selectedDate);
    } else {
      fetchMealHistory();
    }
  };

  // Fetch user's balance (Student/Teacher)
  const fetchMyBalance = async () => {
    try {
      const token = localStorage.getItem('mess_token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/FoodAttendance/my-balance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Backend returns: { summary: { totalMeals, totalFoodCost, totalWaterCharge, totalBalance } }
        setMyBalance(data.summary || {
          totalMeals: 0,
          totalFoodCost: 0,
          totalWaterCharge: 0,
          totalBalance: 0
        });
        setCurrentBill(data.summary?.totalBalance || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  // Fetch user's meal history (Student/Teacher)
  const fetchMyHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('mess_token');
      if (!token) {
        setLoading(false);
        return;
      }

      let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/FoodAttendance/`;
      
      if (historyFilter.type === 'month') {
        url += `my-history?month=${historyFilter.month}&year=${historyFilter.year}`;
      } else {
        url += `my-history-range?startDate=${historyFilter.startDate}&endDate=${historyFilter.endDate}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const transformedData = (data.mealHistory || []).map(record => ({
          id: record.id,
          date: new Date(record.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
          day: new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' }),
          meal: record.mealType,
          itemName: record.itemName,
          foodCost: record.foodCost,
          waterCharge: record.waterCharge,
          cost: record.totalCost
        }));
        setMyHistory(transformedData);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryFilterChange = (e) => {
    const { name, value } = e.target;
    setHistoryFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyHistoryFilter = () => {
    fetchMyHistory();
  };

  // Fetch today's meals (Student/Teacher)
  const fetchTodayMeals = async () => {
    try {
      const token = localStorage.getItem('mess_token');
      if (!token) return;

      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Food/date/${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTodayMeals(data.meals || []);
      }
    } catch (error) {
      console.error('Error fetching today\'s meals:', error);
    }
  };

  // Handle Pay Now button click
  const handlePayNow = async () => {
    setPaymentLoading(true);
    setPaymentMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('mess_token');
      if (!token) {
        setPaymentMessage({ type: 'error', text: 'Authentication token not found' });
        setPaymentLoading(false);
        return;
      }

      // Create Stripe checkout session
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payment/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.checkoutUrl) {
          // Redirect to Stripe checkout
          window.location.href = data.checkoutUrl;
        } else {
          setPaymentMessage({ type: 'error', text: 'Failed to create checkout session' });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setPaymentMessage({ type: 'error', text: errorData.message || 'Failed to initiate payment' });
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentMessage({ type: 'error', text: 'An error occurred while processing payment' });
    } finally {
      setPaymentLoading(false);
    }
  };

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Food`, {
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
        // Refresh meal history
        fetchMealHistory();
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

  const handleEdit = (meal) => {
    setEditingMeal(meal);
    setEditForm({
      date: meal.originalDate || meal.date.split('T')[0],
      mealType: meal.meal,
      itemName: meal.itemName || '',
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
    setFoodMessage({ type: '', text: '' });

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
        setFoodMessage({ type: 'success', text: 'Meal updated successfully!' });
        setEditingMeal(null);
        if (selectedDate) {
          fetchMealsByDate(selectedDate);
        } else {
          fetchMealHistory();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setFoodMessage({ type: 'error', text: errorData.message || 'Failed to update meal' });
      }
    } catch (error) {
      console.error('Error updating meal:', error);
      setFoodMessage({ type: 'error', text: 'An error occurred while updating the meal' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this meal?')) {
      return;
    }

    setFoodMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('mess_token');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/Food/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setFoodMessage({ type: 'success', text: 'Meal deleted successfully!' });
        if (selectedDate) {
          fetchMealsByDate(selectedDate);
        } else {
          fetchMealHistory();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setFoodMessage({ type: 'error', text: errorData.message || 'Failed to delete meal' });
      }
    } catch (error) {
      console.error('Error deleting meal:', error);
      setFoodMessage({ type: 'error', text: 'An error occurred while deleting the meal' });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Welcome back! {username} - {role}</p>
      </div>

      {/* Balance Card - Show for all users */}
      <div className={styles.billSection}>
        {paymentMessage.text && (
          <div style={{
            padding: '12px 20px',
            marginBottom: '15px',
            borderRadius: '5px',
            backgroundColor: paymentMessage.type === 'success' ? '#d4edda' : '#f8d7da',
            color: paymentMessage.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${paymentMessage.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {paymentMessage.text}
          </div>
        )}
        
        <div className={styles.billCard}>
          <div className={styles.billContent}>
            <p className={styles.billLabel}>
              {role === 'Admin' ? 'Total Revenue' : 'Your Balance'}
            </p>
            <h2 className={styles.billAmount}>Rs. {currentBill.toFixed(2)}</h2>
            {role === 'Admin' ? (
              <p className={styles.billSubtext}>Total meals: {mealHistory.length}</p>
            ) : (
              myBalance && (
                <p className={styles.billSubtext}>
                  {myBalance.totalMeals} meals • Water: Rs. {myBalance.totalWaterCharge?.toFixed(2) || 0}
                </p>
              )
            )}
          </div>
          {role !== 'Admin' && (
            <button 
              className={styles.payButton}
              onClick={handlePayNow}
              disabled={paymentLoading || currentBill <= 0}
              style={{
                cursor: (paymentLoading || currentBill <= 0) ? 'not-allowed' : 'pointer',
                opacity: (paymentLoading || currentBill <= 0) ? 0.6 : 1
              }}
            >
              {paymentLoading ? 'Processing...' : 'Pay Now'}
            </button>
          )}
        </div>
      </div>

      {/* Student/Teacher View */}
      {(role === 'Student' || role === 'Teacher') && (
        <>
          {/* Today's Meals */}
          <div className={styles.tableSection} style={{ marginBottom: '20px' }}>
            <h2 className={styles.tableTitle}>Today's Meals</h2>
            
            {todayMeals.length > 0 ? (
              <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                {todayMeals.map((meal) => (
                  <div key={meal.id} style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '2px solid #10b981',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#10b981'
                      }}>
                        {meal.mealType}
                      </span>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#333'
                      }}>
                        Rs. {meal.cost}
                      </span>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      {meal.itemName}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noData}>No meals available for today</p>
            )}
          </div>

          {/* Filter Section */}
          <div className={styles.tableSection} style={{ marginBottom: '20px' }}>
            <h2 className={styles.tableTitle}>Filter History</h2>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                  Filter Type
                </label>
                <select
                  name="type"
                  value={historyFilter.type}
                  onChange={handleHistoryFilterChange}
                  style={{
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="month">By Month</option>
                  <option value="range">By Date Range</option>
                </select>
              </div>

              {historyFilter.type === 'month' ? (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                      Month
                    </label>
                    <select
                      name="month"
                      value={historyFilter.month}
                      onChange={handleHistoryFilterChange}
                      style={{
                        padding: '10px',
                        fontSize: '14px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        outline: 'none',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                      Year
                    </label>
                    <input
                      type="number"
                      name="year"
                      value={historyFilter.year}
                      onChange={handleHistoryFilterChange}
                      min="2020"
                      max="2030"
                      style={{
                        padding: '10px',
                        fontSize: '14px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        outline: 'none',
                        width: '100px'
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={historyFilter.startDate}
                      onChange={handleHistoryFilterChange}
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
                      name="endDate"
                      value={historyFilter.endDate}
                      onChange={handleHistoryFilterChange}
                      style={{
                        padding: '10px',
                        fontSize: '14px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleApplyHistoryFilter}
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
            </div>
          </div>

          {/* My Meal History */}
          <div className={styles.tableSection}>
            <h2 className={styles.tableTitle}>My Meal History</h2>
            
            {loading ? (
              <p className={styles.loading}>Loading...</p>
            ) : myHistory.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Day</th>
                      <th>Meal Type</th>
                      <th>Item</th>
                      <th>Food Cost</th>
                      <th>Water Charge</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myHistory.map((record) => (
                      <tr key={record.id}>
                        <td>{record.date}</td>
                        <td>{record.day}</td>
                        <td>{record.meal}</td>
                        <td>{record.itemName}</td>
                        <td>Rs. {record.foodCost}</td>
                        <td>Rs. {record.waterCharge}</td>
                        <td className={styles.cost}>Rs. {record.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.noData}>No meal history found</p>
            )}
          </div>
        </>
      )}

      {/* Admin View */}
      {role === 'Admin' && (
        <div className={styles.tableSection} style={{ marginBottom: '40px' }}>
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
      )}

      {/* <div className={styles.tableSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h2 className={styles.tableTitle} style={{ margin: 0 }}>Meal History</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                outline: 'none'
              }}
            />
            <button
              onClick={handleDateFilter}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {selectedDate ? 'Filter' : 'Show All'}
            </button>
            {selectedDate && (
              <button
                onClick={() => {
                  setSelectedDate('');
                  fetchMealHistory();
                }}
                style={{
                  padding: '8px 16px',
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
            )}
          </div>
        </div>
        
        {loading ? (
          <p className={styles.loading}>Loading...</p>
        ) : mealHistory.length > 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Meal Type</th>
                  <th>Item Name</th>
                  <th>Cost</th>
                  {role === 'Admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {mealHistory.map((meal) => (
                  <tr key={meal.id}>
                    <td>{meal.date}</td>
                    <td>{meal.day}</td>
                    <td>{meal.meal}</td>
                    <td>{meal.itemName}</td>
                    <td className={styles.cost}>Rs. {meal.cost}</td>
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
          <p className={styles.noData}>No meal history found</p>
        )}
      </div> */}

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