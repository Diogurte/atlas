import signatureUrl from "../assets/maquibraga-signature.jpg";
import type { Supplier } from "./suppliers.service";

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

export function printSupplierRequisition(input: {
  supplier: Supplier;
  orderNumber: string;
  lines: string[];
}) {
  const printable = window.open("", "_blank", "width=980,height=1200");

  if (!printable) {
    alert("O navegador bloqueou a janela da requisição. Permite pop-ups para o Atlas e tenta novamente.");
    return;
  }

  const generatedAt = new Date().toLocaleString("pt-PT");

  printable.document.write(`
    <!doctype html>
    <html lang="pt-PT">
      <head>
        <meta charset="utf-8" />
        <title>Requisição ${escapeHtml(input.orderNumber)}</title>
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
            font-size: 30px;
            color: #101828;
          }
          .subtitle {
            margin: 0 0 24px;
            color: #667085;
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
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
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
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th {
            background: #eef6ff;
            color: #0875f5;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: .08em;
            padding: 10px;
            border: 1px solid #d0d5dd;
          }
          td {
            padding: 11px 10px;
            border: 1px solid #d0d5dd;
            vertical-align: top;
            font-size: 14px;
          }
          .footer {
            margin-top: 32px;
            border-top: 1px solid #d0d5dd;
            padding-top: 16px;
            color: #667085;
            font-size: 12px;
          }
          @media print {
            body { background: #ffffff; }
            .page { width: auto; min-height: auto; margin: 0; }
          }
        </style>
      </head>

      <body>
        <main class="page">
          <header class="header">
            <img class="logo" src="${signatureUrl}" alt="Maquibraga" />
            <div class="doc-meta">
              <strong>${escapeHtml(input.orderNumber)}</strong>
              Gerado em<br />
              ${escapeHtml(generatedAt)}
            </div>
          </header>

          <h1>Requisição de Material</h1>
          <p class="subtitle">
            Documento gerado pelo Atlas para pedido de material ao fornecedor.
          </p>

          <section class="section">
            <h2>Fornecedor</h2>
            <div class="grid">
              <div class="field">
                <span class="label">Nome</span>
                <span class="value">${getValue(input.supplier.name)}</span>
              </div>
              <div class="field">
                <span class="label">Email</span>
                <span class="value">${getValue(input.supplier.email)}</span>
              </div>
              <div class="field">
                <span class="label">NIF</span>
                <span class="value">${getValue(input.supplier.nif)}</span>
              </div>
              <div class="field">
                <span class="label">Notas</span>
                <span class="value">${getValue(input.supplier.notes)}</span>
              </div>
            </div>
          </section>

          <section class="section">
            <h2>Material pedido</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 56px;">#</th>
                  <th>Descrição</th>
                </tr>
              </thead>
              <tbody>
                ${input.lines
                  .map(
                    (line, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(line)}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </section>

          <footer class="footer">
            Maquibraga · Requisição gerada automaticamente pelo Atlas.
          </footer>
        </main>

        <script>
          window.onload = () => {
            window.focus();
          };
        </script>
      </body>
    </html>
  `);

  printable.document.close();
}
