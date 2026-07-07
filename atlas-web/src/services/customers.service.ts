import { supabase } from "../lib/supabase";

export type CustomerRepairSummary = {
  id: string;
  repair_number: string;
  machine: string;
  status: string;
  date: string;
  rawDate: string;
};

export type CustomerListItem = {
  id: string;
  name: string;
  phone: string;
  nif: string;
  email: string;
  notes: string;
  createdAt: string;
  totalRepairs: number;
  lastVisit: string;
  machines: string[];
  repairs: CustomerRepairSummary[];
};

export type CustomerFormData = {
  name: string;
  phone: string;
  nif?: string;
  email?: string;
  notes?: string;
};

function formatDate(date?: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("pt-PT");
}

function cleanOptional(value?: string) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

export async function getCustomers(): Promise<CustomerListItem[]> {
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name, phone, nif, email, notes, created_at")
    .order("name", { ascending: true });

  if (customersError) throw customersError;

  const { data: repairs, error: repairsError } = await supabase
    .from("repairs")
    .select("id, repair_number, customer_id, brand, model, status, created_at")
    .order("created_at", { ascending: false });

  if (repairsError) throw repairsError;

  const repairsByCustomer = new Map<string, CustomerRepairSummary[]>();

  (repairs ?? []).forEach((repair: any) => {
    if (!repair.customer_id) return;

    const current = repairsByCustomer.get(repair.customer_id) ?? [];

    current.push({
      id: repair.id,
      repair_number: repair.repair_number,
      machine: `${repair.brand ?? ""} ${repair.model ?? ""}`.trim(),
      status: repair.status ?? "—",
      date: formatDate(repair.created_at),
      rawDate: repair.created_at,
    });

    repairsByCustomer.set(repair.customer_id, current);
  });

  return (customers ?? []).map((customer: any) => {
    const customerRepairs = repairsByCustomer.get(customer.id) ?? [];
    const machines = Array.from(
      new Set(customerRepairs.map((repair) => repair.machine).filter(Boolean))
    );

    return {
      id: customer.id,
      name: customer.name ?? "Cliente sem nome",
      phone: customer.phone ?? "",
      nif: customer.nif ?? "",
      email: customer.email ?? "",
      notes: customer.notes ?? "",
      createdAt: formatDate(customer.created_at),
      totalRepairs: customerRepairs.length,
      lastVisit: customerRepairs[0]?.date ?? "Sem reparações",
      machines,
      repairs: customerRepairs,
    };
  });
}

export async function createCustomer(form: CustomerFormData): Promise<string> {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      nif: cleanOptional(form.nif),
      email: cleanOptional(form.email),
      notes: cleanOptional(form.notes),
    })
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}

export async function updateCustomer(
  customerId: string,
  form: CustomerFormData
): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .update({
      name: form.name.trim(),
      phone: form.phone.trim(),
      nif: cleanOptional(form.nif),
      email: cleanOptional(form.email),
      notes: cleanOptional(form.notes),
    })
    .eq("id", customerId);

  if (error) throw error;
}


export type CustomerMatch = {
  id: string;
  name: string;
  phone: string;
  nif: string;
  email: string;
  notes: string;
};

function normalizeSearch(value?: string) {
  return value?.trim() ?? "";
}

async function findCustomerByField(
  field: "nif" | "phone",
  value?: string
): Promise<CustomerMatch | null> {
  const cleaned = normalizeSearch(value);

  if (!cleaned) return null;

  const query = supabase
    .from("customers")
    .select("id, name, phone, nif, email, notes")
    .limit(1);

  const { data, error } = await query.eq(field, cleaned).maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const customer: any = data;

  return {
    id: customer.id,
    name: customer.name ?? "",
    phone: customer.phone ?? "",
    nif: customer.nif ?? "",
    email: customer.email ?? "",
    notes: customer.notes ?? "",
  };
}

export async function findCustomerForRepair(input: {
  name?: string;
  phone?: string;
  nif?: string;
}): Promise<CustomerMatch | null> {
  const byNif = await findCustomerByField("nif", input.nif);
  if (byNif) return byNif;

  const byPhone = await findCustomerByField("phone", input.phone);
  if (byPhone) return byPhone;

  // Importante: o nome nunca faz associação automática.
  // Podem existir clientes com o mesmo nome e apelido.
  return null;
}

export async function deleteCustomerAndHistory(customer: CustomerListItem) {
  const repairIds = customer.repairs.map((repair) => repair.id);

  if (repairIds.length > 0) {
    const { error: eventsError } = await supabase
      .from("repair_events")
      .delete()
      .in("repair_id", repairIds);

    if (eventsError) throw eventsError;

    const { error: repairsError } = await supabase
      .from("repairs")
      .delete()
      .in("id", repairIds);

    if (repairsError) throw repairsError;
  }

  const { error: customerError } = await supabase
    .from("customers")
    .delete()
    .eq("id", customer.id);

  if (customerError) throw customerError;
}
