import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import './index.css';

import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Profile from './pages/Profile';
import About from './pages/About';
import Contact from './pages/Contact';
import Pricing from './pages/Pricing';

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/auth', element: <Auth /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/courses', element: <Courses /> },
  { path: '/profile', element: <Profile /> },
  { path: '/about', element: <About /> },
  { path: '/contact', element: <Contact /> },
  { path: '/pricing', element: <Pricing /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster position="top-center" expand={true} richColors />
  </React.StrictMode>
);
