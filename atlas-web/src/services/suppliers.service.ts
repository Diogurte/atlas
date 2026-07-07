import { supabase } from "../lib/supabase";

export type Supplier = {
  id: string;
  name: string;
  nif: string;
  email: string;
  notes: string;
  createdAt: string;
};

export type SupplierFormData = {
  name: string;
  nif?: string;
  email: string;
  notes?: string;
};

export type SupplierOrderItem = {
  id: string;
  supplierId: string;
  description: string;
  reference: string;
  quantity: number;
  notes: string;
  status: "pending" | "sent";
  createdAt: string;
  orderId: string | null;
};

export type SupplierOrder = {
  id: string;
  supplierId: string;
  orderNumber: string;
  emailTo: string;
  createdBy: string;
  createdAt: string;
  rawCreatedAt: string;
  status: string;
  itemCount: number;
  items: SupplierOrderItem[];
};

export type SupplierWorkspace = Supplier & {
  pendingItems: SupplierOrderItem[];
  sentOrders: SupplierOrder[];
};

export type SupplierCommercialCondition = {
  id: string;
  supplierId: string;
  brand: string;
  category: string;
  discount: number;
  storeMargin: number;
  resellerMargin: number;
  onlineMargin: number;
  notes: string;
  createdAt: string;
};

export type SupplierCommercialConditionFormData = {
  brand: string;
  category?: string;
  discount: number;
  storeMargin: number;
  resellerMargin: number;
  onlineMargin: number;
  notes?: string;
};

export type OrderItemFormData = {
  supplierId: string;
  description: string;
  reference?: string;
  quantity: number;
  notes?: string;
};

export type SupplierRequisitionInput = {
  supplier: Supplier;
  requestText: string;
  createdBy?: string;
};

export type SupplierRequisitionResult = {
  orderNumber: string;
  mailto: string;
  lines: string[];
};

function formatDate(date?: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("pt-PT");
}

function cleanOptional(value?: string) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function mapSupplier(supplier: any): Supplier {
  return {
    id: supplier.id,
    name: supplier.name ?? "Fornecedor sem nome",
    nif: supplier.nif ?? "",
    email: supplier.email ?? "",
    notes: supplier.notes ?? "",
    createdAt: formatDate(supplier.created_at),
  };
}

function mapOrderItem(item: any): SupplierOrderItem {
  return {
    id: item.id,
    supplierId: item.supplier_id,
    description: item.description ?? "",
    reference: item.reference ?? "",
    quantity: Number(item.quantity ?? 1),
    notes: item.notes ?? "",
    status: item.status ?? "pending",
    createdAt: formatDate(item.created_at),
    orderId: item.order_id ?? null,
  };
}

function mapOrder(order: any, items: SupplierOrderItem[]): SupplierOrder {
  return {
    id: order.id,
    supplierId: order.supplier_id,
    orderNumber: order.order_number ?? "Pedido sem número",
    emailTo: order.email_to ?? "",
    createdBy: order.created_by ?? "Diogo Pinto",
    createdAt: formatDate(order.created_at),
    rawCreatedAt: order.created_at ?? "",
    status: order.status ?? "sent",
    itemCount: items.length,
    items,
  };
}

function mapCommercialCondition(condition: any): SupplierCommercialCondition {
  return {
    id: condition.id,
    supplierId: condition.supplier_id,
    brand: condition.brand ?? "",
    category: condition.category ?? "Todas",
    discount: Number(condition.supplier_discount ?? 0),
    storeMargin: Number(condition.shop_margin ?? 40),
    resellerMargin: Number(condition.reseller_margin ?? 20),
    onlineMargin: Number(condition.online_margin ?? 15),
    notes: condition.notes ?? "",
    createdAt: formatDate(condition.created_at),
  };
}

export function parseRequisitionLines(requestText: string): string[] {
  return requestText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, nif, email, notes, created_at")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map(mapSupplier);
}

export async function getSupplierWorkspace(): Promise<SupplierWorkspace[]> {
  const [suppliersResult, itemsResult, ordersResult] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, name, nif, email, notes, created_at")
      .order("name", { ascending: true }),
    supabase
      .from("supplier_order_items")
      .select("id, supplier_id, order_id, description, reference, quantity, notes, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("supplier_orders")
      .select("id, supplier_id, order_number, email_to, created_by, status, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (suppliersResult.error) throw suppliersResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (ordersResult.error) throw ordersResult.error;

  const suppliers = (suppliersResult.data ?? []).map(mapSupplier);
  const items = (itemsResult.data ?? []).map(mapOrderItem);
  const ordersRaw = ordersResult.data ?? [];

  const pendingBySupplier = new Map<string, SupplierOrderItem[]>();
  const sentItemsByOrder = new Map<string, SupplierOrderItem[]>();

  items.forEach((item) => {
    if (item.status === "pending") {
      const current = pendingBySupplier.get(item.supplierId) ?? [];
      current.push(item);
      pendingBySupplier.set(item.supplierId, current);
      return;
    }

    if (item.orderId) {
      const current = sentItemsByOrder.get(item.orderId) ?? [];
      current.push(item);
      sentItemsByOrder.set(item.orderId, current);
    }
  });

  const ordersBySupplier = new Map<string, SupplierOrder[]>();

  ordersRaw.forEach((order: any) => {
    const orderItems = sentItemsByOrder.get(order.id) ?? [];
    const mappedOrder = mapOrder(order, orderItems);
    const current = ordersBySupplier.get(mappedOrder.supplierId) ?? [];
    current.push(mappedOrder);
    ordersBySupplier.set(mappedOrder.supplierId, current);
  });

  return suppliers.map((supplier) => ({
    ...supplier,
    pendingItems: pendingBySupplier.get(supplier.id) ?? [],
    sentOrders: ordersBySupplier.get(supplier.id) ?? [],
  }));
}

export async function createSupplier(form: SupplierFormData): Promise<string> {
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name: form.name.trim(),
      nif: cleanOptional(form.nif),
      email: form.email.trim(),
      notes: cleanOptional(form.notes),
    })
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}

export async function updateSupplier(
  supplierId: string,
  form: SupplierFormData
): Promise<void> {
  const { error } = await supabase
    .from("suppliers")
    .update({
      name: form.name.trim(),
      nif: cleanOptional(form.nif),
      email: form.email.trim(),
      notes: cleanOptional(form.notes),
    })
    .eq("id", supplierId);

  if (error) throw error;
}

export async function deleteSupplierAndHistory(supplierId: string): Promise<void> {
  const { error: itemsError } = await supabase
    .from("supplier_order_items")
    .delete()
    .eq("supplier_id", supplierId);

  if (itemsError) throw itemsError;

  const { error: ordersError } = await supabase
    .from("supplier_orders")
    .delete()
    .eq("supplier_id", supplierId);

  if (ordersError) throw ordersError;

  const { error: supplierError } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", supplierId);

  if (supplierError) throw supplierError;
}

export async function addSupplierOrderItem(form: OrderItemFormData): Promise<void> {
  const { error } = await supabase.from("supplier_order_items").insert({
    supplier_id: form.supplierId,
    description: form.description.trim(),
    reference: cleanOptional(form.reference),
    quantity: Number(form.quantity) || 1,
    notes: cleanOptional(form.notes),
    status: "pending",
  });

  if (error) throw error;
}

export async function deleteSupplierOrderItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from("supplier_order_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
}

function buildOrderNumber(prefix = "REQ") {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const time = `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
  return `${prefix}-${stamp}-${time}`;
}

export function buildSupplierEmail(supplier: Supplier, orderNumber: string, items: SupplierOrderItem[]) {
  const subject = `Pedido de Material ${orderNumber} - Maquibraga`;
  const lines = [
    "Bom dia,",
    "",
    "Segue pedido de material:",
    "",
    ...items.map((item, index) => {
      const reference = item.reference ? ` | Ref.: ${item.reference}` : "";
      const notes = item.notes ? ` | Obs.: ${item.notes}` : "";
      return `${index + 1}. ${item.description} | Qtd: ${item.quantity}${reference}${notes}`;
    }),
    "",
    "Obrigado.",
    "Maquibraga",
  ];

  return {
    subject,
    body: lines.join("\n"),
    mailto: `mailto:${encodeURIComponent(supplier.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`,
  };
}

export function buildSupplierRequisitionEmail(
  supplier: Supplier,
  orderNumber: string,
  lines: string[]
) {
  const subject = `Requisição de Material ${orderNumber} - Maquibraga`;
  const bodyLines = [
    "Bom dia,",
    "",
    "Segue requisição de material:",
    "",
    ...lines.map((line, index) => `${index + 1}. ${line}`),
    "",
    "Obrigado.",
    "Maquibraga",
  ];

  return {
    subject,
    body: bodyLines.join("\n"),
    mailto: `mailto:${encodeURIComponent(supplier.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`,
  };
}

export async function sendSupplierOrder(input: {
  supplier: Supplier;
  items: SupplierOrderItem[];
  createdBy?: string;
}): Promise<{ orderNumber: string; mailto: string }> {
  if (input.items.length === 0) {
    throw new Error("Não existem artigos pendentes para enviar.");
  }

  const orderNumber = buildOrderNumber("PED");
  const email = buildSupplierEmail(input.supplier, orderNumber, input.items);

  const { data: order, error: orderError } = await supabase
    .from("supplier_orders")
    .insert({
      supplier_id: input.supplier.id,
      order_number: orderNumber,
      email_to: input.supplier.email,
      created_by: input.createdBy ?? "Diogo Pinto",
      status: "sent",
    })
    .select("id")
    .single();

  if (orderError) throw orderError;

  const { error: itemsError } = await supabase
    .from("supplier_order_items")
    .update({
      status: "sent",
      order_id: order.id,
      sent_at: new Date().toISOString(),
    })
    .in(
      "id",
      input.items.map((item) => item.id)
    );

  if (itemsError) throw itemsError;

  return {
    orderNumber,
    mailto: email.mailto,
  };
}

export async function sendSupplierTextRequisition(
  input: SupplierRequisitionInput
): Promise<SupplierRequisitionResult> {
  const lines = parseRequisitionLines(input.requestText);

  if (lines.length === 0) {
    throw new Error("Cola primeiro o material que queres pedir.");
  }

  const orderNumber = buildOrderNumber("REQ");
  const email = buildSupplierRequisitionEmail(input.supplier, orderNumber, lines);

  const { data: order, error: orderError } = await supabase
    .from("supplier_orders")
    .insert({
      supplier_id: input.supplier.id,
      order_number: orderNumber,
      email_to: input.supplier.email,
      created_by: input.createdBy ?? "Diogo Pinto",
      status: "sent",
    })
    .select("id")
    .single();

  if (orderError) throw orderError;

  const { error: itemsError } = await supabase.from("supplier_order_items").insert(
    lines.map((line) => ({
      supplier_id: input.supplier.id,
      order_id: order.id,
      description: line,
      quantity: 1,
      status: "sent",
      sent_at: new Date().toISOString(),
    }))
  );

  if (itemsError) throw itemsError;

  return {
    orderNumber,
    mailto: email.mailto,
    lines,
  };
}

export async function updateSupplierOrder(input: {
  orderId: string;
  supplierId: string;
  requestText: string;
}): Promise<void> {
  const lines = parseRequisitionLines(input.requestText);

  if (lines.length === 0) {
    throw new Error("O pedido tem de ter pelo menos uma linha.");
  }

  const { error: deleteError } = await supabase
    .from("supplier_order_items")
    .delete()
    .eq("order_id", input.orderId);

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("supplier_order_items").insert(
    lines.map((line) => ({
      supplier_id: input.supplierId,
      order_id: input.orderId,
      description: line,
      quantity: 1,
      status: "sent",
      sent_at: new Date().toISOString(),
    }))
  );

  if (insertError) throw insertError;
}

export async function deleteSupplierOrder(orderId: string): Promise<void> {
  const { error: itemsError } = await supabase
    .from("supplier_order_items")
    .delete()
    .eq("order_id", orderId);

  if (itemsError) throw itemsError;

  const { error: orderError } = await supabase
    .from("supplier_orders")
    .delete()
    .eq("id", orderId);

  if (orderError) throw orderError;
}


export async function getSupplierCommercialConditions(
  supplierId?: string
): Promise<SupplierCommercialCondition[]> {
  let query = supabase
    .from("supplier_brand_conditions")
    .select(
      "id, supplier_id, brand, category, supplier_discount, shop_margin, reseller_margin, online_margin, notes, created_at"
    )
    .order("brand", { ascending: true });

  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map(mapCommercialCondition);
}

export async function createSupplierCommercialCondition(
  supplierId: string,
  form: SupplierCommercialConditionFormData
): Promise<void> {
  const { error } = await supabase.from("supplier_brand_conditions").insert({
    supplier_id: supplierId,
    brand: form.brand.trim(),
    category: cleanOptional(form.category) ?? "Todas",
    supplier_discount: Number(form.discount) || 0,
    shop_margin: Number(form.storeMargin) || 40,
    reseller_margin: Number(form.resellerMargin) || 20,
    online_margin: Number(form.onlineMargin) || 15,
    notes: cleanOptional(form.notes),
  });

  if (error) throw error;
}

export async function updateSupplierCommercialCondition(
  conditionId: string,
  form: SupplierCommercialConditionFormData
): Promise<void> {
  const { error } = await supabase
    .from("supplier_brand_conditions")
    .update({
      brand: form.brand.trim(),
      category: cleanOptional(form.category) ?? "Todas",
      supplier_discount: Number(form.discount) || 0,
      shop_margin: Number(form.storeMargin) || 40,
      reseller_margin: Number(form.resellerMargin) || 20,
      online_margin: Number(form.onlineMargin) || 15,
      notes: cleanOptional(form.notes),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conditionId);

  if (error) throw error;
}

export async function deleteSupplierCommercialCondition(conditionId: string): Promise<void> {
  const { error } = await supabase
    .from("supplier_brand_conditions")
    .delete()
    .eq("id", conditionId);

  if (error) throw error;
}

export function getSupplierModuleErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (message.includes("supplier_brand_conditions")) {
    return "Falta a tabela supplier_brand_conditions ou uma das suas colunas. Executa docs/database/atlas_database_master.sql no Supabase.";
  }

  if (message.includes("supplier_order_items")) {
    return "Falta a tabela supplier_order_items ou uma das suas colunas. Executa docs/database/atlas_database_master.sql no Supabase.";
  }

  if (message.includes("supplier_orders")) {
    return "Falta a tabela supplier_orders ou uma das suas colunas. Executa docs/database/atlas_database_master.sql no Supabase.";
  }

  if (message.includes("suppliers")) {
    return "Falta a tabela suppliers ou uma das suas colunas. Executa docs/database/atlas_database_master.sql no Supabase.";
  }

  return message || "Não foi possível carregar o módulo de fornecedores.";
}
