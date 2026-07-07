import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "../components/ui/Button";
import { useAuth } from "../auth/AuthContext";
import { ALL_PERMISSIONS, PERMISSION_LABELS, getDefaultPermissions, type PermissionKey, type PermissionMap } from "../auth/permissions";
import { Card } from "../components/ui/Card";
import { AppLayout } from "../layouts/AppLayout";
import {
  DEFAULT_ATLAS_SETTINGS,
  getAtlasSettings,
  getSettingsErrorMessage,
  saveAtlasSettings,
  seedDefaultSettings,
  SETTINGS_TABLE_SQL,
  type AtlasSettings,
} from "../services/settings.service";
import {
  createUserProfile,
  deleteUserProfile,
  getUsers,
  updateUserProfile,
  type AtlasUserProfile,
  type AtlasUserRole,
} from "../services/users.service";

type SettingsSection =
  | "company"
  | "priceEngine"
  | "emails"
  | "repairs"
  | "atlasAi"
  | "users"
  | "system";

const sections: { id: SettingsSection; label: string; description: string }[] = [
  {
    id: "company",
    label: "Empresa",
    description: "Dados usados em PDFs, emails e documentos oficiais.",
  },
  {
    id: "priceEngine",
    label: "Price Engine",
    description: "Margens e regras padrão para cálculos comerciais.",
  },
  {
    id: "emails",
    label: "Emails",
    description: "Texto base dos pedidos e assinaturas de email.",
  },
  {
    id: "repairs",
    label: "Reparações",
    description: "Textos e valores padrão usados no workflow.",
  },
  {
    id: "atlasAi",
    label: "Atlas AI",
    description: "Personalidade operacional do assistente.",
  },
  {
    id: "users",
    label: "Utilizadores",
    description: "Logins, perfis e permissões por módulo.",
  },
  {
    id: "system",
    label: "Sistema",
    description: "Versão, estado e ferramentas de diagnóstico.",
  },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<AtlasSettings>(DEFAULT_ATLAS_SETTINGS);
  const [activeSection, setActiveSection] = useState<SettingsSection>("company");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [users, setUsers] = useState<AtlasUserProfile[]>([]);
  const { can, profile, refreshProfile } = useAuth();

  async function loadSettings() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await getAtlasSettings();
      setSettings(data);
    } catch (error) {
      setErrorMessage(getSettingsErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadUsers() {
    if (!can("users")) return;

    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      setErrorMessage(getSettingsErrorMessage(error));
    }
  }

  useEffect(() => {
    loadSettings();
    loadUsers();
  }, []);

  const activeDescription = useMemo(
    () => sections.find((section) => section.id === activeSection)?.description ?? "",
    [activeSection]
  );

  function updateSetting<Section extends keyof AtlasSettings, Field extends keyof AtlasSettings[Section]>(
    section: Section,
    field: Field,
    value: AtlasSettings[Section][Field]
  ) {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      await saveAtlasSettings({
        ...settings,
        system: {
          ...settings.system,
          lastUpdated: new Date().toISOString(),
        },
      });

      setMessage("✔ Definições guardadas com sucesso");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setErrorMessage(getSettingsErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  function handleResetDefaults() {
    if (!confirm("Repor as definições padrão do Atlas?")) return;
    setSettings(DEFAULT_ATLAS_SETTINGS);
    setMessage("Definições padrão carregadas. Carrega em Guardar para aplicar.");
  }

  async function handleCopySettingsSql() {
    await navigator.clipboard.writeText(SETTINGS_TABLE_SQL);
    setMessage("SQL das Definições copiado");
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleCreateDefaultSettings() {
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      await seedDefaultSettings();
      await loadSettings();
      setMessage("✔ Definições padrão criadas com sucesso");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setErrorMessage(getSettingsErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }


  async function handleCreateUser(input: {
    name: string;
    email: string;
    role: AtlasUserRole;
    permissions: PermissionMap;
  }) {
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      await createUserProfile(input);
      await loadUsers();
      setMessage("✔ Utilizador criado. Agora pode criar conta no ecrã de login com esse email.");
      setTimeout(() => setMessage(""), 3500);
    } catch (error) {
      setErrorMessage(getSettingsErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateUser(
    userId: string,
    input: {
      name?: string;
      role?: AtlasUserRole;
      permissions?: PermissionMap;
      active?: boolean;
    }
  ) {
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      await updateUserProfile(userId, input);
      await loadUsers();
      await refreshProfile();
      setMessage("✔ Utilizador atualizado");
      setTimeout(() => setMessage(""), 2500);
    } catch (error) {
      setErrorMessage(getSettingsErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Eliminar este perfil de utilizador? O login do Supabase pode continuar a existir, mas perde o perfil no Atlas.")) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      await deleteUserProfile(userId);
      await loadUsers();
      setMessage("✔ Perfil eliminado");
      setTimeout(() => setMessage(""), 2500);
    } catch (error) {
      setErrorMessage(getSettingsErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppLayout>
      {message && (
        <div className="fixed right-8 top-8 z-50 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-emerald-300">
          {message}
        </div>
      )}

      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            Definições
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">
            Centro de Configuração
          </h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Configura empresa, documentos, emails, Price Engine e comportamento geral do Atlas num único lugar.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleResetDefaults}>
            Repor padrão
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? "A guardar..." : "Guardar definições"}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Card className="mb-6 border-amber-400/30 bg-amber-400/5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-amber-200">
                Configuração necessária
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
                {errorMessage}
              </p>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Se já executaste o SQL no Supabase, carrega em “Voltar a verificar”. Se a tabela existir mas estiver vazia, usa “Criar padrões”.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={handleCopySettingsSql}>
                Copiar SQL
              </Button>
              <Button variant="secondary" onClick={handleCreateDefaultSettings} disabled={isSaving}>
                Criar padrões
              </Button>
              <Button onClick={loadSettings}>
                Voltar a verificar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-slate-400">A carregar definições...</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <aside className="space-y-3">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                  activeSection === section.id
                    ? "border-cyan-400/40 bg-cyan-400/10 text-white"
                    : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                <span className="font-semibold">{section.label}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {section.description}
                </span>
              </button>
            ))}
          </aside>

          <main className="space-y-6">
            <Card>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">
                {sections.find((section) => section.id === activeSection)?.label}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                {sections.find((section) => section.id === activeSection)?.label}
              </h2>
              <p className="mt-3 text-slate-400">{activeDescription}</p>
            </Card>

            {activeSection === "company" && (
              <Card>
                <div className="grid gap-5 md:grid-cols-2">
                  <TextInput label="Nome da empresa" value={settings.company.name} onChange={(value) => updateSetting("company", "name", value)} />
                  <TextInput label="NIF" value={settings.company.nif} onChange={(value) => updateSetting("company", "nif", value)} />
                  <TextInput label="Telefone" value={settings.company.phone} onChange={(value) => updateSetting("company", "phone", value)} />
                  <TextInput label="Email" type="email" value={settings.company.email} onChange={(value) => updateSetting("company", "email", value)} />
                  <TextInput label="Website" value={settings.company.website} onChange={(value) => updateSetting("company", "website", value)} />
                  <TextInput label="Assinatura PDF / URL do logótipo" value={settings.company.pdfSignatureUrl} onChange={(value) => updateSetting("company", "pdfSignatureUrl", value)} />
                  <TextareaInput label="Morada" value={settings.company.address} onChange={(value) => updateSetting("company", "address", value)} className="md:col-span-2" />
                </div>
              </Card>
            )}

            {activeSection === "priceEngine" && (
              <Card>
                <div className="grid gap-5 md:grid-cols-5">
                  <NumberInput label="Margem Loja" suffix="%" value={settings.priceEngine.shopMargin} onChange={(value) => updateSetting("priceEngine", "shopMargin", value)} />
                  <NumberInput label="Margem Revenda" suffix="%" value={settings.priceEngine.resellerMargin} onChange={(value) => updateSetting("priceEngine", "resellerMargin", value)} />
                  <NumberInput label="Margem Online" suffix="%" value={settings.priceEngine.onlineMargin} onChange={(value) => updateSetting("priceEngine", "onlineMargin", value)} />
                  <NumberInput label="IVA" suffix="%" value={settings.priceEngine.vat} onChange={(value) => updateSetting("priceEngine", "vat", value)} />
                  <NumberInput label="Casas decimais" value={settings.priceEngine.decimals} onChange={(value) => updateSetting("priceEngine", "decimals", value)} />
                </div>
                <p className="mt-5 text-sm text-slate-500">
                  Estas margens são usadas como valores padrão quando crias novas condições comerciais por fornecedor/marca.
                </p>
              </Card>
            )}

            {activeSection === "emails" && (
              <Card>
                <div className="space-y-5">
                  <TextInput label="Assunto padrão dos pedidos" value={settings.emails.supplierOrderSubject} onChange={(value) => updateSetting("emails", "supplierOrderSubject", value)} />
                  <TextareaInput label="Corpo padrão do email" value={settings.emails.supplierOrderBody} onChange={(value) => updateSetting("emails", "supplierOrderBody", value)} rows={6} />
                  <TextareaInput label="Assinatura" value={settings.emails.signature} onChange={(value) => updateSetting("emails", "signature", value)} rows={3} />
                </div>
              </Card>
            )}

            {activeSection === "repairs" && (
              <Card>
                <div className="space-y-5">
                  <TextInput label="Garantia padrão" value={settings.repairs.defaultWarranty} onChange={(value) => updateSetting("repairs", "defaultWarranty", value)} />
                  <TextareaInput label="Texto do comprovativo" value={settings.repairs.receiptText} onChange={(value) => updateSetting("repairs", "receiptText", value)} rows={4} />
                  <TextareaInput label="Texto de entrega" value={settings.repairs.deliveryText} onChange={(value) => updateSetting("repairs", "deliveryText", value)} rows={4} />
                </div>
              </Card>
            )}

            {activeSection === "atlasAi" && (
              <Card>
                <div className="grid gap-5 md:grid-cols-2">
                  <TextInput label="Nome do assistente" value={settings.atlasAi.name} onChange={(value) => updateSetting("atlasAi", "name", value)} />
                  <TextInput label="Idioma" value={settings.atlasAi.language} onChange={(value) => updateSetting("atlasAi", "language", value)} />
                  <TextareaInput label="Tom / comportamento" value={settings.atlasAi.tone} onChange={(value) => updateSetting("atlasAi", "tone", value)} className="md:col-span-2" rows={4} />
                </div>
              </Card>
            )}

            {activeSection === "users" && (
              <UserManagement
                users={users}
                currentUserId={profile?.id ?? ""}
                canManageUsers={can("users")}
                onCreate={handleCreateUser}
                onUpdate={handleUpdateUser}
                onDelete={handleDeleteUser}
              />
            )}

            {activeSection === "system" && (
              <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                  <h3 className="text-2xl font-semibold text-white">Estado do sistema</h3>
                  <div className="mt-5 space-y-3">
                    <SystemStatus label="Supabase" ok={!errorMessage} />
                    <SystemStatus label="PDFs" ok />
                    <SystemStatus label="Price Engine" ok />
                    <SystemStatus label="Atlas AI Operacional" ok />
                  </div>
                </Card>

                <Card>
                  <h3 className="text-2xl font-semibold text-white">Versão</h3>
                  <div className="mt-5 space-y-4">
                    <Info label="Versão atual" value={settings.system.version} />
                    <Info label="Última alteração" value={new Date(settings.system.lastUpdated).toLocaleString("pt-PT")} />
                    <Info label="Ambiente" value="Local / Supabase" />
                  </div>
                </Card>
              </div>
            )}
          </main>
        </div>
      )}
    </AppLayout>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-white outline-none transition focus:border-cyan-400"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm text-slate-400">{label}</span>
      <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-white focus-within:border-cyan-400">
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full bg-transparent outline-none"
        />
        {suffix && <span className="text-slate-500">{suffix}</span>}
      </div>
    </label>
  );
}

function TextareaInput({
  label,
  value,
  onChange,
  rows = 4,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm text-slate-400">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-white outline-none transition focus:border-cyan-400"
      />
    </label>
  );
}


function UserManagement({
  users,
  currentUserId,
  canManageUsers,
  onCreate,
  onUpdate,
  onDelete,
}: {
  users: AtlasUserProfile[];
  currentUserId: string;
  canManageUsers: boolean;
  onCreate: (input: {
    name: string;
    email: string;
    role: AtlasUserRole;
    permissions: PermissionMap;
  }) => Promise<void>;
  onUpdate: (
    userId: string,
    input: {
      name?: string;
      role?: AtlasUserRole;
      permissions?: PermissionMap;
      active?: boolean;
    }
  ) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AtlasUserRole>("Funcionário");

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newName.trim() || !newEmail.trim()) return;

    await onCreate({
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      permissions: getDefaultPermissions(newRole),
    });

    setNewName("");
    setNewEmail("");
    setNewRole("Funcionário");
  }

  if (!canManageUsers) {
    return (
      <Card>
        <h3 className="text-2xl font-semibold text-white">Utilizadores</h3>
        <p className="mt-3 text-slate-400">
          O teu perfil não tem permissão para gerir utilizadores.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-2xl font-semibold text-white">Criar perfil de utilizador</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Cria primeiro o perfil aqui. Depois a pessoa entra no ecrã de login, escolhe “Criar conta” e usa exatamente este email.
          O Atlas associa automaticamente esse login às permissões configuradas.
        </p>

        <form className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr_220px_auto]" onSubmit={handleCreate}>
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nome"
            className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-400"
          />
          <input
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="Email"
            className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-400"
          />
          <select
            value={newRole}
            onChange={(event) => setNewRole(event.target.value as AtlasUserRole)}
            className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-400"
          >
            <option>Funcionário</option>
            <option>Administrador</option>
            <option>Owner</option>
          </select>
          <Button type="submit">Criar perfil</Button>
        </form>
      </Card>

      <div className="space-y-4">
        {users.length === 0 ? (
          <Card>
            <p className="text-slate-400">Ainda não existem utilizadores registados.</p>
          </Card>
        ) : (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isCurrentUser={user.id === currentUserId}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

function UserCard({
  user,
  isCurrentUser,
  onUpdate,
  onDelete,
}: {
  user: AtlasUserProfile;
  isCurrentUser: boolean;
  onUpdate: (
    userId: string,
    input: {
      name?: string;
      role?: AtlasUserRole;
      permissions?: PermissionMap;
      active?: boolean;
    }
  ) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<AtlasUserRole>(user.role);
  const [permissions, setPermissions] = useState<PermissionMap>(user.permissions);
  const [active, setActive] = useState(user.active);

  useEffect(() => {
    setName(user.name);
    setRole(user.role);
    setPermissions(user.permissions);
    setActive(user.active);
  }, [user]);

  function applyRole(nextRole: AtlasUserRole) {
    setRole(nextRole);
    setPermissions(getDefaultPermissions(nextRole));
  }

  function togglePermission(permission: PermissionKey) {
    setPermissions((current) => ({
      ...current,
      [permission]: !current[permission],
    }));
  }

  return (
    <Card>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="grid gap-4 xl:grid-cols-[1fr_260px_220px]">
            <label>
              <span className="mb-2 block text-sm text-slate-400">Nome</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-400"
              />
            </label>

            <div>
              <span className="mb-2 block text-sm text-slate-400">Email</span>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-slate-300">
                {user.email}
              </div>
            </div>

            <label>
              <span className="mb-2 block text-sm text-slate-400">Perfil</span>
              <select
                value={role}
                onChange={(event) => applyRole(event.target.value as AtlasUserRole)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-400"
              >
                <option>Funcionário</option>
                <option>Administrador</option>
                <option>Owner</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActive((value) => !value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                active ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"
              }`}
            >
              {active ? "Ativo" : "Bloqueado"}
            </button>
            <span className="rounded-full bg-slate-950 px-4 py-2 text-xs text-slate-400">
              {user.authUserId ? "Login ligado" : "A aguardar primeiro login"}
            </span>
            {isCurrentUser && (
              <span className="rounded-full bg-cyan-400/10 px-4 py-2 text-xs text-cyan-300">
                És tu
              </span>
            )}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ALL_PERMISSIONS.map((permission) => (
              <label
                key={permission}
                className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={permissions[permission]}
                  onChange={() => togglePermission(permission)}
                  className="h-4 w-4 accent-cyan-400"
                />
                {PERMISSION_LABELS[permission]}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 xl:flex-col">
          <Button
            onClick={() => onUpdate(user.id, { name, role, permissions, active })}
          >
            Guardar
          </Button>
          <Button variant="secondary" onClick={() => applyRole(role)}>
            Repor perfil
          </Button>
          {!isCurrentUser && (
            <Button variant="ghost" onClick={() => onDelete(user.id)}>
              Eliminar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function SystemStatus({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <span className="text-slate-300">{label}</span>
      <span className={ok ? "text-emerald-300" : "text-red-300"}>
        {ok ? "✓ Operacional" : "⚠ Verificar"}
      </span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-white">{value}</p>
    </div>
  );
}
