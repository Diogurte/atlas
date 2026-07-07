import { useEffect, useMemo, useState } from "react";

import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import {
  findCustomerForRepair,
  type CustomerMatch,
} from "../../../services/customers.service";

const accessories = ["Mala", "Carregador", "Bateria", "Disco", "Broca", "Caixa", "Manual"];

export type RepairFormData = {
  customer: string;
  phone: string;
  taxNumber?: string;
  email?: string;
  brand: string;
  model: string;
  serialNumber?: string;
  problem: string;
  internalNotes?: string;
  accessories?: string;
  warranty?: string;
};

type RepairFormProps = {
  mode?: "create" | "edit";
  initialData?: Partial<RepairFormData>;
  onCancel?: () => void;
  onSave?: (data: RepairFormData) => void;
};

export function RepairForm({
  mode = "create",
  initialData,
  onCancel,
  onSave,
}: RepairFormProps) {
  const [customerFields, setCustomerFields] = useState({
    customer: initialData?.customer ?? "",
    phone: initialData?.phone ?? "",
    taxNumber: initialData?.taxNumber ?? "",
    email: initialData?.email ?? "",
  });

  const [customerMatch, setCustomerMatch] = useState<CustomerMatch | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  const hasEnoughCustomerDataToSearch = useMemo(() => {
    return (
      customerFields.taxNumber.trim().length >= 5 ||
      customerFields.phone.trim().length >= 5
    );
  }, [customerFields.phone, customerFields.taxNumber]);

  function updateCustomerField(
    field: keyof typeof customerFields,
    value: string
  ) {
    setCustomerFields((current) => ({
      ...current,
      [field]: value,
    }));
  }

  useEffect(() => {
    if (mode !== "create") return;

    let ignore = false;

    if (!hasEnoughCustomerDataToSearch) {
      setCustomerMatch(null);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsSearchingCustomer(true);

      try {
        const match = await findCustomerForRepair({
          name: customerFields.customer,
          phone: customerFields.phone,
          nif: customerFields.taxNumber,
        });

        if (ignore) return;

        setCustomerMatch(match);

        if (match) {
          setCustomerFields((current) => ({
            customer: match.name || current.customer,
            phone: match.phone || current.phone,
            taxNumber: match.nif || current.taxNumber,
            email: match.email || current.email,
          }));
        }
      } finally {
        if (!ignore) setIsSearchingCustomer(false);
      }
    }, 350);

    return () => {
      ignore = true;
      window.clearTimeout(timeout);
    };
  }, [customerFields.customer, customerFields.phone, customerFields.taxNumber, hasEnoughCustomerDataToSearch, mode]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const selectedAccessories = formData
      .getAll("accessories")
      .map(String);

    const otherAccessory = String(formData.get("otherAccessory") ?? "").trim();

    const allAccessories = [...selectedAccessories];

    if (otherAccessory) {
      allAccessories.push(otherAccessory);
    }

    onSave?.({
      customer: customerFields.customer.trim(),
      phone: customerFields.phone.trim(),
      taxNumber: customerFields.taxNumber.trim(),
      email: customerFields.email.trim(),
      brand: String(formData.get("brand") ?? ""),
      model: String(formData.get("model") ?? ""),
      serialNumber: String(formData.get("serialNumber") ?? ""),
      problem: String(formData.get("problem") ?? ""),
      internalNotes: String(formData.get("internalNotes") ?? ""),
      accessories: allAccessories.join(", "),
      warranty: String(formData.get("warranty") ?? "Não confirmado"),
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">👤 Cliente</h3>
            <p className="mt-2 text-sm text-slate-400">
              O Atlas associa automaticamente apenas por NIF ou telemóvel. O nome nunca faz match automático para evitar enganos.
            </p>
          </div>

          {mode === "create" && (
            <CustomerDetectionBadge
              isSearching={isSearchingCustomer}
              hasEnoughData={hasEnoughCustomerDataToSearch}
              match={customerMatch}
            />
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <ControlledInput
            label="Nome *"
            value={customerFields.customer}
            onChange={(value) => updateCustomerField("customer", value)}
          />
          <ControlledInput
            label="Telemóvel *"
            value={customerFields.phone}
            onChange={(value) => updateCustomerField("phone", value)}
          />
          <ControlledInput
            label="NIF"
            value={customerFields.taxNumber}
            onChange={(value) => updateCustomerField("taxNumber", value)}
          />
          <ControlledInput
            label="Email"
            value={customerFields.email}
            onChange={(value) => updateCustomerField("email", value)}
          />
        </div>

        {mode === "create" && customerMatch && (
          <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
            <p className="text-sm font-semibold text-emerald-300">
              ✓ Cliente existente encontrado
            </p>
            <p className="mt-2 text-sm text-slate-300">
              A reparação será associada à ficha de <strong>{customerMatch.name}</strong>.
            </p>
            <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-3">
              <span>📞 {customerMatch.phone || "Sem telefone"}</span>
              <span>NIF: {customerMatch.nif || "—"}</span>
              <span>{customerMatch.email || "Sem email"}</span>
            </div>
          </div>
        )}

        {mode === "create" && hasEnoughCustomerDataToSearch && !customerMatch && !isSearchingCustomer && (
          <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
            <p className="text-sm font-semibold text-cyan-300">
              + Novo cliente
            </p>
            <p className="mt-2 text-sm text-slate-400">
Ainda não encontrei cliente com este NIF ou telemóvel. Ao guardar, o Atlas cria automaticamente a ficha dele.
            </p>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-xl font-semibold text-white">🔧 Máquina</h3>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Input name="brand" label="Marca *" defaultValue={initialData?.brand} />
          <Input name="model" label="Modelo *" defaultValue={initialData?.model} />
          <Input
            name="serialNumber"
            label="Número de série"
            defaultValue={initialData?.serialNumber}
            className="md:col-span-2"
          />
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold text-white">📋 Reparação</h3>

        <div className="mt-5 grid gap-4">
          <TextArea name="problem" label="Problema indicado *" defaultValue={initialData?.problem} />
          <TextArea name="internalNotes" label="Observações internas" defaultValue={initialData?.internalNotes} />
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold text-white">📦 Acessórios</h3>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {accessories.map((item) => (
            <label
              key={item}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-300"
            >
              <input
                name="accessories"
                value={item}
                type="checkbox"
                defaultChecked={initialData?.accessories
                  ?.toLowerCase()
                  .includes(item.toLowerCase())}
              />
              {item}
            </label>
          ))}
        </div>

        <div className="mt-4">
          <Input name="otherAccessory" label="Outro" />
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold text-white">🛡️ Garantia</h3>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {["Dentro da garantia", "Fora da garantia", "Não confirmado"].map((item) => (
            <label
              key={item}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-300"
            >
              <input
                name="warranty"
                value={item}
                type="radio"
                defaultChecked={(initialData?.warranty ?? "Não confirmado") === item}
              />
              {item}
            </label>
          ))}
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancelar
          </Button>
        )}

        <Button variant="secondary" type="submit">
          {mode === "edit" ? "Guardar alterações" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function CustomerDetectionBadge({
  isSearching,
  hasEnoughData,
  match,
}: {
  isSearching: boolean;
  hasEnoughData: boolean;
  match: CustomerMatch | null;
}) {
  if (isSearching) {
    return (
      <span className="w-fit rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
        A procurar cliente...
      </span>
    );
  }

  if (match) {
    return (
      <span className="w-fit rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
        Cliente existente
      </span>
    );
  }

  if (hasEnoughData) {
    return (
      <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
        Novo cliente
      </span>
    );
  }

  return (
    <span className="w-fit rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
      Sem dados suficientes
    </span>
  );
}

function ControlledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-400">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
      />
    </div>
  );
}

function Input({
  name,
  label,
  defaultValue = "",
  className = "",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm text-slate-400">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
      />
    </div>
  );
}

function TextArea({
  name,
  label,
  defaultValue = "",
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-400">{label}</label>
      <textarea
        name={name}
        rows={3}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
      />
    </div>
  );
}
