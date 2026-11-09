import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { useTranslation } from "react-i18next";
import type { Permission } from "@travel-agency/shared";
import { Card } from "./ui/Card.js";
import { Button } from "./ui/Button.js";
import { ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { user, isLoading, hasPermission } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-terracotta-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sand-600 font-medium">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center border-red-200">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-indigo-950 mb-2">Accès restreint / صلاحية غير كافية</h2>
          <p className="text-sand-600 text-sm mb-6">
            Votre compte ({user.email}) avec le rôle <strong>{user.role}</strong> ne dispose pas de la permission requise ({requiredPermission}).
          </p>
          <Button variant="outline" onClick={() => window.history.back()} className="w-full">
            Retour / رجوع
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

