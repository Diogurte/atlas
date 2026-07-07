import { NavLink } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import type { PermissionKey } from "../../auth/permissions";

const menu: { label: string; icon: string; path: string; permission: PermissionKey }[] = [
  { label: "Dashboard", icon: "🏠", path: "/dashboard", permission: "dashboard" },
  { label: "Reparações", icon: "🔧", path: "/repairs", permission: "repairs" },
  { label: "Clientes", icon: "👥", path: "/clients", permission: "clients" },
  { label: "Pedidos", icon: "📦", path: "/orders", permission: "orders" },
  { label: "Pricing", icon: "💰", path: "/pricing", permission: "pricing" },
  { label: "Fornecedores", icon: "🏢", path: "/suppliers", permission: "suppliers" },
  { label: "Knowledge", icon: "📚", path: "/knowledge", permission: "knowledge" },
  { label: "Atlas AI", icon: "🤖", path: "/ai", permission: "ai" },
  { label: "Definições", icon: "⚙️", path: "/settings", permission: "settings" },
];

export function Sidebar() {
  const { can } = useAuth();
  const visibleMenu = menu.filter((item) => can(item.permission));

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-cyan-400">
          Atlas Ecosystem
        </p>

        <h2 className="mt-3 text-3xl font-bold text-white">Atlas</h2>
      </div>

      <nav className="flex-1 px-4 py-6">
        {visibleMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `mb-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                isActive
                  ? "bg-cyan-400/10 text-white ring-1 ring-cyan-400/30"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-6 text-sm text-slate-500">
        Atlas v1.0.0
      </div>
    </aside>
  );
}
