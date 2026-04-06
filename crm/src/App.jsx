import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GuestList from './pages/GuestList';
import GuestDetail from './pages/GuestDetail';
import ReservationList from './pages/ReservationList';
import ReservationDetail from './pages/ReservationDetail';
import ImportWizard from './pages/ImportWizard';

function ProtectedRoute({ user, loading, children }) {
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-snow">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-creek border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-rawhide font-body">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Layout user={user}>{children}</Layout>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login user={user} />} />

      <Route
        path="/"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guests"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <GuestList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guests/:id"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <GuestDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservations"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <ReservationList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservations/:id"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <ReservationDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/import"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <ImportWizard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <div className="max-w-2xl">
              <h1 className="text-2xl font-display font-bold text-timber mb-4">Settings</h1>
              <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-6">
                <p className="text-rawhide font-body">Settings page coming soon.</p>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
