import type { RepairDetail, RepairEvent } from "./repairs.service";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getValue(value?: string) {
  const clean = value?.trim();
  return clean ? escapeHtml(clean) : "—";
}

function buildEventRows(events: RepairEvent[]) {
  if (events.length === 0) {
    return `<p class="muted">Ainda não existem acontecimentos registados.</p>`;
  }

  return events
    .map(
      (event) => `
        <div class="event">
          <div class="event-date">${escapeHtml(event.date)}</div>
          <div class="event-text">${escapeHtml(event.event)}</div>
        </div>
      `
    )
    .join("");
}

export function printRepairReceipt(repair: RepairDetail, events: RepairEvent[]) {
  const printable = window.open("", "_blank", "width=980,height=1200");

  if (!printable) {
    alert("O navegador bloqueou a janela de impressão. Permite pop-ups para o Atlas e tenta novamente.");
    return;
  }

  const generatedAt = new Date().toLocaleString("pt-PT");

  printable.document.write(`
    <!doctype html>
    <html lang="pt-PT">
      <head>
        <meta charset="utf-8" />
        <title>Comprovativo ${escapeHtml(repair.repair_number)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #f4f7fb;
            color: #101828;
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.45;
          }
          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #ffffff;
            padding: 18mm;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            border-bottom: 4px solid #0875f5;
            padding-bottom: 18px;
          }
          .logo {
            max-width: 360px;
            width: 55%;
            height: auto;
          }
          .doc-meta {
            text-align: right;
            font-size: 12px;
            color: #475467;
          }
          .doc-meta strong {
            display: block;
            color: #101828;
            font-size: 15px;
            margin-bottom: 4px;
          }
          h1 {
            margin: 28px 0 8px;
            font-size: 28px;
            color: #101828;
          }
          .subtitle {
            margin: 0 0 24px;
            color: #667085;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-top: 16px;
          }
          .section {
            border: 1px solid #d0d5dd;
            border-radius: 16px;
            padding: 16px;
            margin-top: 16px;
            break-inside: avoid;
          }
          .section h2 {
            margin: 0 0 14px;
            font-size: 16px;
            color: #0875f5;
            text-transform: uppercase;
            letter-spacing: .08em;
          }
          .field {
            margin-bottom: 10px;
          }
          .label {
            display: block;
            color: #667085;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: .07em;
            margin-bottom: 2px;
          }
          .value {
            font-size: 14px;
            color: #101828;
            font-weight: 700;
          }
          .full { grid-column: 1 / -1; }
          .box {
            background: #f8fafc;
            border: 1px solid #eaecf0;
            border-radius: 12px;
            padding: 12px;
            min-height: 48px;
            white-space: pre-wrap;
          }
          .events {
            margin-top: 8px;
          }
          .event {
            border-left: 3px solid #0875f5;
            padding: 8px 0 8px 12px;
            margin-bottom: 8px;
          }
          .event-date {
            color: #667085;
            font-size: 12px;
            margin-bottom: 2px;
          }
          .event-text {
            font-size: 13px;
            color: #101828;
          }
          .muted { color: #667085; }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #d0d5dd;
            padding-top: 16px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            color: #475467;
            font-size: 12px;
          }
          .signature {
            margin-top: 40px;
            border-top: 1px solid #98a2b3;
            padding-top: 8px;
            text-align: center;
          }
          @media print {
            body { background: #ffffff; }
            .page { margin: 0; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="header">
            <img class="logo" src="/maquibraga-signature.jpg" alt="Maquibraga" />
            <div class="doc-meta">
              <strong>${escapeHtml(repair.repair_number)}</strong>
              Documento gerado em<br />${escapeHtml(generatedAt)}
            </div>
          </header>

          <h1>Comprovativo de Reparação</h1>
          <p class="subtitle">Documento emitido pelo Atlas para consulta, impressão ou arquivo.</p>

          <div class="grid">
            <section class="section">
              <h2>Cliente</h2>
              <div class="field"><span class="label">Nome</span><span class="value">${getValue(repair.customer)}</span></div>
              <div class="field"><span class="label">Telemóvel</span><span class="value">${getValue(repair.phone)}</span></div>
              <div class="field"><span class="label">NIF</span><span class="value">${getValue(repair.taxNumber)}</span></div>
              <div class="field"><span class="label">Email</span><span class="value">${getValue(repair.email)}</span></div>
            </section>

            <section class="section">
              <h2>Máquina</h2>
              <div class="field"><span class="label">Marca</span><span class="value">${getValue(repair.brand)}</span></div>
              <div class="field"><span class="label">Modelo</span><span class="value">${getValue(repair.model)}</span></div>
              <div class="field"><span class="label">Número de série</span><span class="value">${getValue(repair.serialNumber)}</span></div>
              <div class="field"><span class="label">Acessórios</span><span class="value">${getValue(repair.accessories)}</span></div>
            </section>

            <section class="section full">
              <h2>Reparação</h2>
              <div class="grid">
                <div class="field"><span class="label">Estado</span><span class="value">${getValue(repair.status)}</span></div>
                <div class="field"><span class="label">Garantia</span><span class="value">${getValue(repair.warranty)}</span></div>
                <div class="field"><span class="label">Data de entrada</span><span class="value">${getValue(repair.date)}</span></div>
                <div class="field"><span class="label">Fornecedor</span><span class="value">${getValue(repair.supplier)}</span></div>
              </div>
            </section>

            <section class="section full">
              <h2>Problema indicado pelo cliente</h2>
              <div class="box">${getValue(repair.problem)}</div>
            </section>

            <section class="section full">
              <h2>Observações internas</h2>
              <div class="box">${getValue(repair.internalNotes)}</div>
            </section>

            <section class="section full">
              <h2>Diário da Reparação</h2>
              <div class="events">${buildEventRows(events)}</div>
            </section>
          </div>

          <footer class="footer">
            <div>
              Obrigado pela preferência.<br />
              Documento gerado automaticamente pelo Atlas.
            </div>
            <div class="signature">Assinatura / confirmação do cliente</div>
          </footer>
        </main>
        <script>
          window.addEventListener('load', () => {
            setTimeout(() => window.print(), 300);
          });
        </script>
      </body>
    </html>
  `);

  printable.document.close();
}
