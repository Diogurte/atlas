import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AtlasAIPage } from "./pages/AtlasAIPage";
import { ClientsPage } from "./pages/ClientsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { LoginPage } from "./pages/LoginPage";
import { OrdersPage } from "./pages/OrdersPage";
import { PricingPage } from "./pages/PricingPage";
import { RepairDetailPage } from "./pages/RepairDetailPage";
import { RepairsPage } from "./pages/RepairsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SupplierDetailPage } from "./pages/SupplierDetailPage";
import { SuppliersPage } from "./pages/SuppliersPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ProtectedRoute><ForbiddenPage /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<ProtectedRoute permission="dashboard"><DashboardPage /></ProtectedRoute>} />
        <Route path="/repairs" element={<ProtectedRoute permission="repairs"><RepairsPage /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute permission="clients"><ClientsPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute permission="orders"><OrdersPage /></ProtectedRoute>} />
        <Route path="/repairs/:repairId" element={<ProtectedRoute permission="repairs"><RepairDetailPage /></ProtectedRoute>} />
        <Route path="/pricing" element={<ProtectedRoute permission="pricing"><PricingPage /></ProtectedRoute>} />
        <Route path="/knowledge" element={<ProtectedRoute permission="knowledge"><KnowledgePage /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute permission="suppliers"><SuppliersPage /></ProtectedRoute>} />
        <Route path="/suppliers/:supplierId" element={<ProtectedRoute permission="suppliers"><SupplierDetailPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute permission="settings"><SettingsPage /></ProtectedRoute>} />
        <Route path="/ai" element={<ProtectedRoute permission="ai"><AtlasAIPage /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
