import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Register from './pages/Register';
import Pass from './pages/Pass';
import Scan from './pages/Scan';
import Dashboard from './pages/Dashboard';
import Guards from './pages/Guards';
import './styles.css';

function App() {
  return (
    <Router>
      <Navbar />
      <main>
        <Routes>
          <Route path="/"           element={<Home />}      />
          <Route path="/register"   element={<Register />}  />
          <Route path="/pass/:id"   element={<Pass />}      />
          <Route path="/scan"       element={<Scan />}      />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/guards"    element={<Guards />}    />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
