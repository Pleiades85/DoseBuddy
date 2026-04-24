import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { ToastProvider } from './components/ui';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load components
const Layout = React.lazy(() => import('./components/Layout'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Inventory = React.lazy(() => import('./pages/Inventory'));
const Patients = React.lazy(() => import('./pages/Patients'));
const PatientProfile = React.lazy(() => import('./pages/PatientProfile'));
const PharmacyProfile = React.lazy(() => import('./pages/PharmacyProfile'));
const Orders = React.lazy(() => import('./pages/Orders'));
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));

// Create query client with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Router>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
              <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
                <Route index element={<Dashboard />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="patients" element={<Patients />} />
                <Route path="patients/:id" element={<PatientProfile />} />
                <Route path="pharmacy-profile" element={<PharmacyProfile />} />
                <Route path="orders" element={<Orders />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
