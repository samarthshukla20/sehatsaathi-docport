import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DoctorDashboard from "./pages/DoctorDashboard";

const App = () => (
  <BrowserRouter>
    <Routes>
      {/* Redirect root URL to /doctor automatically */}
      <Route path="/" element={<Navigate to="/doctor" replace />} />
      
      {/* The Doctor Portal */}
      <Route path="/doctor" element={<DoctorDashboard />} />
    </Routes>
  </BrowserRouter>
);

export default App;