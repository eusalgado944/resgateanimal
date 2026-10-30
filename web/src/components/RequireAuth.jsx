import { Navigate, useLocation } from 'react-router-dom';
import { auth } from '../api.js';

export default function RequireAuth({ children }) {
  const location = useLocation();
  if (!auth.token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
