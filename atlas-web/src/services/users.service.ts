import { supabase } from "../lib/supabase";
import {
  getDefaultPermissions,
  normalizePermissions,
  type PermissionMap,
} from "../auth/permissions";

export type AtlasUserRole = "Owner" | "Administrador" | "Funcionário";

export type AtlasUserProfile = {
  id: string;
  authUserId: string | null;
  name: string;
  email: string;
  role: AtlasUserRole;
  permissions: PermissionMap;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const OWNER_EMAILS = ["diogorodri123@gmail.com"];

function mapUser(row: any): AtlasUserProfile {
  return {
    id: row.id,
    authUserId: row.auth_user_id ?? null,
    name: row.name ?? row.email ?? "Utilizador",
    email: row.email ?? "",
    role: (row.role ?? "Funcionário") as AtlasUserRole,
    permissions: normalizePermissions(row.permissions, row.role),
    active: row.active !== false,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export function getOwnerRoleForEmail(email: string | undefined): AtlasUserRole {
  return email && OWNER_EMAILS.includes(email.toLowerCase()) ? "Owner" : "Funcionário";
}

export async function getOrCreateUserProfile(params: {
  authUserId: string;
  email: string;
  name?: string;
}): Promise<AtlasUserProfile> {
  const email = params.email.toLowerCase();

  const { data: existingByAuth, error: authError } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth_user_id", params.authUserId)
    .maybeSingle();

  if (authError) throw authError;
  if (existingByAuth) return mapUser(existingByAuth);

  const { data: existingByEmail, error: emailError } = await supabase
    .from("app_users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (emailError) throw emailError;

  if (existingByEmail) {
    const { data, error } = await supabase
      .from("app_users")
      .update({
        auth_user_id: params.authUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingByEmail.id)
      .select()
      .single();

    if (error) throw error;
    return mapUser(data);
  }

  const role = getOwnerRoleForEmail(email);
  const { data, error } = await supabase
    .from("app_users")
    .insert({
      auth_user_id: params.authUserId,
      email,
      name: params.name || email.split("@")[0],
      role,
      permissions: getDefaultPermissions(role),
      active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return mapUser(data);
}

export async function getUsers(): Promise<AtlasUserProfile[]> {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapUser);
}

export async function createUserProfile(input: {
  name: string;
  email: string;
  role: AtlasUserRole;
  permissions?: PermissionMap;
}) {
  const role = input.role;
  const { error } = await supabase.from("app_users").insert({
    name: input.name,
    email: input.email.toLowerCase(),
    role,
    permissions: input.permissions ?? getDefaultPermissions(role),
    active: true,
  });

  if (error) throw error;
}

export async function updateUserProfile(
  userId: string,
  input: {
    name?: string;
    role?: AtlasUserRole;
    permissions?: PermissionMap;
    active?: boolean;
  }
) {
  const { error } = await supabase
    .from("app_users")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
}

export async function deleteUserProfile(userId: string) {
  const { error } = await supabase.from("app_users").delete().eq("id", userId);
  if (error) throw error;
}
