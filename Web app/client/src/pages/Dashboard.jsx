import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { fetchStats, fetchInventory } from '../services/api';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Users, Package, Clock } from 'lucide-react';
import { Card, H2, SkeletonCard, ErrorState, EmptyState, Badge } from '../components/ui';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, inventoryData] = await Promise.all([
        fetchStats(),
        fetchInventory(100)
      ]);
      setStats(statsData);
      setInventoryCount(inventoryData.length);
      const lowStock = inventoryData.filter(item => item.quantity < 10);
      setLowStockItems(lowStock);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (error) return <ErrorState title="Failed to load dashboard" description={error} onRetry={loadData} />;

  const salesData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Weekly Activity',
      data: [12, 19, 30, 50, 20, 30, 45],
      backgroundColor: 'rgba(8, 145, 178, 0.15)',
      borderColor: 'var(--primary)',
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: { 
        ticks: { color: 'var(--text-muted)', font: { size: 12 } }, 
        grid: { color: 'rgba(0,0,0,0.04)' },
        border: { display: false }
      },
      x: { 
        ticks: { color: 'var(--text-muted)', font: { size: 12 } }, 
        grid: { display: false },
        border: { display: false }
      },
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <H2>Dashboard</H2>
        {lastUpdated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            <Clock size={12} />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard title="Total Inventory" value={inventoryCount} change="Items" icon={<Package size={20} />} iconBg="var(--primary-light)" iconColor="var(--primary)" />
            <StatCard title="Active Patients" value={stats?.totalPatients || 0} change="+5%" icon={<Users size={20} />} iconBg="var(--info-light)" iconColor="var(--info)" />
            <StatCard 
              title="Low Stock Items" 
              value={lowStockItems.length} 
              change={lowStockItems.length > 0 ? "Action Needed" : "All Good"} 
              isWarning={lowStockItems.length > 0} 
              icon={<AlertTriangle size={20} />} 
              iconBg={lowStockItems.length > 0 ? 'var(--warning-light)' : 'var(--success-light)'}
              iconColor={lowStockItems.length > 0 ? 'var(--warning)' : 'var(--success)'}
            />
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-5)' }}>
        {/* Chart */}
        <Card>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>Weekly Overview</h3>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Patient interactions this week</p>
          </div>
          <div style={{ height: 260 }}>
            {!loading && <Bar data={salesData} options={options} />}
          </div>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <AlertTriangle size={16} color="var(--warning)" />
            <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>Low Stock Alerts</h3>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[1,2,3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : lowStockItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {lowStockItems.slice(0, 5).map(item => (
                <div key={item.id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: 'var(--space-3) var(--space-4)', 
                  background: 'var(--warning-light)', 
                  borderRadius: 'var(--radius)', 
                  border: '1px solid rgba(245, 158, 11, 0.2)' 
                }}>
                  <span style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>{item.name}</span>
                  <Badge variant="warning">{item.quantity} left</Badge>
                </div>
              ))}
              {lowStockItems.length > 5 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
                  + {lowStockItems.length - 5} more items
                </p>
              )}
            </div>
          ) : (
            <EmptyState title="All stocked up!" description="No items are running low." />
          )}
        </Card>
      </div>
    </motion.div>
  );
};

const StatCard = ({ title, value, change, isWarning, icon, iconBg, iconColor }) => (
  <Card hoverable>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-3)' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 500 }}>{title}</span>
      <div style={{ 
        padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', 
        background: iconBg || 'var(--primary-light)', color: iconColor || 'var(--primary)' 
      }}>
        {icon}
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
      <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--text)' }}>{value}</span>
      <Badge variant={isWarning ? 'warning' : 'success'} size="sm">{change}</Badge>
    </div>
  </Card>
);

export default Dashboard;
