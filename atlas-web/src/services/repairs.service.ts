import { supabase } from "../lib/supabase";
import type { RepairFormData } from "../modules/repairs/components/RepairForm";
import { findCustomerForRepair } from "./customers.service";

export type RepairListItem = {
  id: string;
  repair_number: string;
  customer: string;
  phone: string;
  machine: string;
  status: string;
  date: string;
};

export type RepairDetail = {
  id: string;
  customerId: string;
  repair_number: string;
  customer: string;
  phone: string;
  taxNumber: string;
  email: string;
  brand: string;
  model: string;
  machine: string;
  serialNumber: string;
  problem: string;
  internalNotes: string;
  accessories: string;
  warranty: string;
  status: string;
  supplier: string;
  date: string;
};

export type RepairEvent = {
  id: string;
  event: string;
  date: string;
};

export type CreatedRepair = {
  id: string;
  repair_number: string;
};

export async function getRepairs(): Promise<RepairListItem[]> {
  const { data, error } = await supabase
    .from("repairs")
    .select("id, repair_number, brand, model, status, created_at, customers(name, phone)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((repair: any) => ({
    id: repair.id,
    repair_number: repair.repair_number,
    customer: repair.customers?.name ?? "Cliente sem nome",
    phone: repair.customers?.phone ?? "",
    machine: `${repair.brand} ${repair.model}`,
    status: repair.status,
    date: new Date(repair.created_at).toLocaleString("pt-PT"),
  }));
}

export async function getRepairById(id: string): Promise<RepairDetail | null> {
  const { data, error } = await supabase
    .from("repairs")
    .select(
      "id, repair_number, customer_id, brand, model, serial_number, problem, internal_notes, accessories, warranty, status, supplier, created_at, customers(name, phone, nif, email)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const repair: any = data;

  return {
    id: repair.id,
    customerId: repair.customer_id ?? "",
    repair_number: repair.repair_number,
    customer: repair.customers?.name ?? "Cliente sem nome",
    phone: repair.customers?.phone ?? "",
    taxNumber: repair.customers?.nif ?? "",
    email: repair.customers?.email ?? "",
    brand: repair.brand,
    model: repair.model,
    machine: `${repair.brand} ${repair.model}`,
    serialNumber: repair.serial_number ?? "",
    problem: repair.problem,
    internalNotes: repair.internal_notes ?? "",
    accessories: repair.accessories ?? "Sem acessórios.",
    warranty: repair.warranty ?? "Não confirmado",
    status: repair.status,
    supplier: repair.supplier ?? "—",
    date: new Date(repair.created_at).toLocaleString("pt-PT"),
  };
}

export async function getRepairEvents(repairId: string): Promise<RepairEvent[]> {
  const { data, error } = await supabase
    .from("repair_events")
    .select("id, event, created_at")
    .eq("repair_id", repairId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((item: any) => ({
    id: item.id,
    event: item.event,
    date: new Date(item.created_at).toLocaleString("pt-PT"),
  }));
}

export async function createRepair(form: RepairFormData): Promise<CreatedRepair> {
  const existingCustomer = await findCustomerForRepair({
    name: form.customer,
    phone: form.phone,
    nif: form.taxNumber,
  });

  let customerId = existingCustomer?.id;

  if (existingCustomer) {
    const { error: updateCustomerError } = await supabase
      .from("customers")
      .update({
        name: form.customer || existingCustomer.name,
        phone: form.phone || existingCustomer.phone,
        nif: form.taxNumber || existingCustomer.nif || null,
        email: form.email || existingCustomer.email || null,
      })
      .eq("id", existingCustomer.id);

    if (updateCustomerError) throw updateCustomerError;
  } else {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        name: form.customer,
        phone: form.phone,
        nif: form.taxNumber || null,
        email: form.email || null,
      })
      .select()
      .single();

    if (customerError) throw customerError;

    customerId = customer.id;
  }

  const { count } = await supabase
    .from("repairs")
    .select("id", { count: "exact", head: true });

  const repairNumber = `REP-${new Date().getFullYear()}-${String(
    (count ?? 0) + 1
  ).padStart(4, "0")}`;

  const { data: repair, error: repairError } = await supabase
    .from("repairs")
    .insert({
      repair_number: repairNumber,
      customer_id: customerId,
      brand: form.brand,
      model: form.model,
      serial_number: form.serialNumber || null,
      problem: form.problem,
      internal_notes: form.internalNotes || null,
      accessories: form.accessories || null,
      warranty: form.warranty || "Não confirmado",
      status: "A aguardar diagnóstico",
    })
    .select()
    .single();

  if (repairError) throw repairError;

  await supabase.from("repair_events").insert({
    repair_id: repair.id,
    event: existingCustomer
      ? `Reparação criada e associada ao cliente existente ${form.customer}. Problema indicado: ${form.problem}`
      : `Reparação criada. Máquina recebida para diagnóstico. Problema indicado: ${form.problem}`,
  });

  return {
    id: repair.id,
    repair_number: repair.repair_number,
  };
}

export async function updateRepairStatus(
  repairId: string,
  nextStatus: string,
  eventDescription: string
) {
  const { error: repairError } = await supabase
    .from("repairs")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", repairId);

  if (repairError) throw repairError;

  const { error: eventError } = await supabase.from("repair_events").insert({
    repair_id: repairId,
    event: eventDescription,
  });

  if (eventError) throw eventError;
}


export async function deleteRepair(repairId: string) {
  const { error: eventsError } = await supabase
    .from("repair_events")
    .delete()
    .eq("repair_id", repairId);

  if (eventsError) throw eventsError;

  const { error: repairError } = await supabase
    .from("repairs")
    .delete()
    .eq("id", repairId);

  if (repairError) throw repairError;
}

export async function addRepairEvent(
  repairId: string,
  eventDescription: string
) {
  const { error } = await supabase.from("repair_events").insert({
    repair_id: repairId,
    event: eventDescription,
  });

  if (error) throw error;
}

export async function addRepairNote(
  repairId: string,
  note: string,
  context: "Nota" | "Nota pós-entrega" = "Nota"
) {
  await addRepairEvent(repairId, `${context}: ${note}`);
}

export async function updateRepairDetails(
  repair: RepairDetail,
  form: RepairFormData
) {
  const { error: customerError } = await supabase
    .from("customers")
    .update({
      name: form.customer,
      phone: form.phone,
      nif: form.taxNumber || null,
      email: form.email || null,
    })
    .eq("id", repair.customerId);

  if (customerError) throw customerError;

  const { error: repairError } = await supabase
    .from("repairs")
    .update({
      brand: form.brand,
      model: form.model,
      serial_number: form.serialNumber || null,
      problem: form.problem,
      internal_notes: form.internalNotes || null,
      accessories: form.accessories || null,
      warranty: form.warranty || "Não confirmado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", repair.id);

  if (repairError) throw repairError;

  await addRepairEvent(repair.id, "Dados da reparação atualizados.");
}
