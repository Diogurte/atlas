export type PermissionKey =
  | "dashboard"
  | "repairs"
  | "clients"
  | "orders"
  | "pricing"
  | "suppliers"
  | "knowledge"
  | "ai"
  | "settings"
  | "users"
  | "delete_records"
  | "edit_prices";

export type PermissionMap = Record<PermissionKey, boolean>;

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  dashboard: "Dashboard",
  repairs: "Reparações",
  clients: "Clientes",
  orders: "Pedidos",
  pricing: "Price Engine",
  suppliers: "Fornecedores",
  knowledge: "Knowledge",
  ai: "Atlas AI",
  settings: "Definições",
  users: "Gerir utilizadores",
  delete_records: "Eliminar registos",
  edit_prices: "Editar preços",
};

export const ALL_PERMISSIONS: PermissionKey[] = [
  "dashboard",
  "repairs",
  "clients",
  "orders",
  "pricing",
  "suppliers",
  "knowledge",
  "ai",
  "settings",
  "users",
  "delete_records",
  "edit_prices",
];

export const OWNER_PERMISSIONS: PermissionMap = ALL_PERMISSIONS.reduce(
  (permissions, key) => ({ ...permissions, [key]: true }),
  {} as PermissionMap
);

export const ADMIN_PERMISSIONS: PermissionMap = {
  dashboard: true,
  repairs: true,
  clients: true,
  orders: true,
  pricing: true,
  suppliers: true,
  knowledge: true,
  ai: true,
  settings: false,
  users: false,
  delete_records: true,
  edit_prices: true,
};

export const EMPLOYEE_PERMISSIONS: PermissionMap = {
  dashboard: true,
  repairs: true,
  clients: true,
  orders: true,
  pricing: false,
  suppliers: true,
  knowledge: true,
  ai: true,
  settings: false,
  users: false,
  delete_records: false,
  edit_prices: false,
};

export function getDefaultPermissions(role: string): PermissionMap {
  if (role === "Owner") return OWNER_PERMISSIONS;
  if (role === "Administrador") return ADMIN_PERMISSIONS;
  return EMPLOYEE_PERMISSIONS;
}

export function normalizePermissions(value: unknown, role = "Funcionário"): PermissionMap {
  const defaults = getDefaultPermissions(role);
  const incoming = typeof value === "object" && value !== null ? (value as Partial<PermissionMap>) : {};

  return ALL_PERMISSIONS.reduce(
    (permissions, key) => ({
      ...permissions,
      [key]: typeof incoming[key] === "boolean" ? Boolean(incoming[key]) : defaults[key],
    }),
    {} as PermissionMap
  );
}
