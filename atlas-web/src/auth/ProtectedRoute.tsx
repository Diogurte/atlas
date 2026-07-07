import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./AuthContext";
import type { PermissionKey } from "./permissions";

type Props = {
  children: ReactNode;
  permission?: PermissionKey;
};

export function ProtectedRoute({ children, permission }: Props) {
  const { session, profile, isLoading, can } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        A carregar Atlas...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!profile?.active) {
    return <Navigate to="/forbidden" replace />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
