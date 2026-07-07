import { useEffect, useMemo, useState } from "react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { AppLayout } from "../layouts/AppLayout";
import {
  analyzePriceFile,
  buildPreparedFileName,
  buildProcessedFileName,
  downloadBlob,
  preparePriceMap,
  processFilledPriceMap,
  type PriceEngineAnalysis,
  type PriceEngineCommercialSettings,
  type PriceEngineResult,
} from "../services/priceEngine.service";
import {
  getSupplierCommercialConditions,
  getSuppliers,
  type Supplier,
  type SupplierCommercialCondition,
} from "../services/suppliers.service";

type StepStatus = "idle" | "loading" | "success" | "error";

export function PricingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<PriceEngineAnalysis | null>(null);
  const [result, setResult] = useState<PriceEngineResult | null>(null);
  const [status, setStatus] = useState<StepStatus>("idle");
  const [message, setMessage] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [conditions, setConditions] = useState<SupplierCommercialCondition[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedConditionId, setSelectedConditionId] = useState("");

  useEffect(() => {
    async function loadCommercialData() {
      try {
        const [supplierData, conditionData] = await Promise.all([
          getSuppliers(),
          getSupplierCommercialConditions(),
        ]);

        setSuppliers(supplierData);
        setConditions(conditionData);

        if (supplierData[0]) setSelectedSupplierId(supplierData[0].id);
      } catch (error) {
        setStatus("error");
        setMessage(
          `${getErrorMessage(error)}. Confirma se executaste o SQL das condições comerciais.`
        );
      }
    }

    loadCommercialData();
  }, []);

  const supplierConditions = useMemo(
    () => conditions.filter((condition) => condition.supplierId === selectedSupplierId),
    [conditions, selectedSupplierId]
  );

  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null;
  const selectedCondition =
    supplierConditions.find((condition) => condition.id === selectedConditionId) ??
    supplierConditions[0] ??
    null;

  useEffect(() => {
    if (!selectedSupplierId) {
      setSelectedConditionId("");
      return;
    }

    if (selectedConditionId && supplierConditions.some((condition) => condition.id === selectedConditionId)) {
      return;
    }

    setSelectedConditionId(supplierConditions[0]?.id ?? "");
  }, [selectedSupplierId, selectedConditionId, supplierConditions]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;

    setFile(selectedFile);
    setResult(null);
    setMessage("");

    if (!selectedFile) {
      setAnalysis(null);
      return;
    }

    try {
      setStatus("loading");
      const data = await analyzePriceFile(selectedFile);
      setAnalysis(data);
      setStatus("success");
    } catch (error) {
      setAnalysis(null);
      setStatus("error");
      setMessage(getErrorMessage(error));
    }
  }

  async function handlePrepareMap() {
    if (!file) return;

    try {
      setStatus("loading");
      const blob = await preparePriceMap(file);
      downloadBlob(blob, buildPreparedFileName(file.name));
      setStatus("success");
      setMessage("Mapa preparado. Preenche a coluna Novo PrecoTabela com o preço de tabela do fornecedor e volta a importar o ficheiro.");
    } catch (error) {
      setStatus("error");
      setMessage(getErrorMessage(error));
    }
  }

  async function handleProcessMap() {
    if (!file) return;

    if (!selectedSupplier || !selectedCondition) {
      setStatus("error");
      setMessage("Escolhe primeiro o fornecedor e a marca com condições comerciais configuradas.");
      return;
    }

    const commercialSettings: PriceEngineCommercialSettings = {
      supplierName: selectedSupplier.name,
      brand: selectedCondition.brand,
      category: selectedCondition.category,
      discount: selectedCondition.discount,
      storeMargin: selectedCondition.storeMargin,
      resellerMargin: selectedCondition.resellerMargin,
      onlineMargin: selectedCondition.onlineMargin,
    };

    try {
      setStatus("loading");
      const processed = await processFilledPriceMap(file, commercialSettings);

      downloadBlob(processed.blob, buildProcessedFileName(file.name));
      setResult(processed.result);
      setStatus("success");
      setMessage(
        `Mapa final gerado com ${selectedCondition.discount}% de desconto ${selectedSupplier.name} / ${selectedCondition.brand}. A coluna provisória foi removida.`
      );
    } catch (error) {
      setStatus("error");
      setMessage(getErrorMessage(error));
    }
  }

  const canProcess = Boolean(file && selectedSupplier && selectedCondition && status !== "loading");

  return (
    <AppLayout>
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
          Price Engine
        </p>

        <h1 className="mt-3 text-4xl font-bold text-white">
          Motor de Preços Keinvoice
        </h1>

        <p className="mt-3 max-w-3xl text-slate-400">
          Escolhe o fornecedor e a marca, importa o mapa do Keinvoice, preenche o preço de tabela novo e o Atlas calcula automaticamente o PrecoCusto, Loja, Revenda e Site Online.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <h2 className="text-2xl font-semibold text-white">
              1. Condições comerciais
            </h2>

            <p className="mt-2 text-slate-400">
              O desconto e as margens vêm da ficha do fornecedor. Assim só precisas preencher o preço de tabela.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm text-slate-400">Fornecedor</span>
                <select
                  value={selectedSupplierId}
                  onChange={(event) => setSelectedSupplierId(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
                >
                  {suppliers.length === 0 && <option value="">Sem fornecedores</option>}
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm text-slate-400">Marca / condição</span>
                <select
                  value={selectedCondition?.id ?? ""}
                  onChange={(event) => setSelectedConditionId(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
                >
                  {supplierConditions.length === 0 && <option value="">Sem condições comerciais</option>}
                  {supplierConditions.map((condition) => (
                    <option key={condition.id} value={condition.id}>
                      {condition.brand} · {condition.category || "Todas"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedCondition ? (
              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <Metric label="Desconto" value={`${selectedCondition.discount}%`} />
                <Metric label="Loja" value={`${selectedCondition.storeMargin}%`} />
                <Metric label="Revenda" value={`${selectedCondition.resellerMargin}%`} />
                <Metric label="Site Online" value={`${selectedCondition.onlineMargin}%`} />
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
                Este fornecedor ainda não tem condições comerciais. Abre a ficha do fornecedor e adiciona a marca/desconto.
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  2. Importar mapa de preços
                </h2>

                <p className="mt-2 text-slate-400">
                  Usa o ficheiro Excel exportado do Keinvoice para a família de artigos pretendida.
                </p>
              </div>

              <span className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
                XLSX
              </span>
            </div>

            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-950 px-6 py-10 text-center transition hover:border-cyan-400/50">
              <span className="text-4xl">📄</span>
              <span className="mt-3 text-lg font-semibold text-white">
                {file ? file.name : "Escolher ficheiro Excel"}
              </span>
              <span className="mt-1 text-sm text-slate-500">
                Formato esperado: .xlsx com PrecoCusto, Loja, Revenda e Site Online
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {analysis && (
              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <Metric label="Folha" value={analysis.sheetName} />
                <Metric label="Artigos" value={String(analysis.totalRows)} />
                <Metric
                  label="Colunas OK"
                  value={String(analysis.recognizedColumns.length)}
                />
                <Metric
                  label="Coluna provisória"
                  value={analysis.hasTemporaryColumn ? "Sim" : "Não"}
                />
              </div>
            )}

            {analysis && analysis.missingColumns.length > 0 && (
              <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-200">
                Faltam colunas: {analysis.missingColumns.join(", ")}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-2xl font-semibold text-white">
              3. Preparar mapa para preencher
            </h2>

            <p className="mt-2 text-slate-400">
              O Atlas devolve o mesmo ficheiro, apenas com a coluna temporária
              <span className="font-semibold text-white"> Novo PrecoTabela</span>. Nesta coluna colocas o preço de tabela do fornecedor.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button disabled={!file || status === "loading"} onClick={handlePrepareMap}>
                Preparar atualização
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-2xl font-semibold text-white">
              4. Gerar mapa final para o Keinvoice
            </h2>

            <p className="mt-2 text-slate-400">
              Depois de preencheres a coluna Novo PrecoTabela, importa esse ficheiro aqui. O Atlas aplica o desconto da marca, calcula o PrecoCusto e recalcula as margens.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button disabled={!canProcess} onClick={handleProcessMap}>
                Gerar mapa final
              </Button>
            </div>

            {result && (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Metric label="Alterados" value={String(result.changedRows)} />
                <Metric label="Sem alteração" value={String(result.unchangedRows)} />
                <Metric label="Total" value={String(result.totalRows)} />
              </div>
            )}

            {result && result.warnings.length > 0 && (
              <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
                <p className="font-semibold">Avisos</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {result.warnings.slice(0, 6).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-semibold text-white">Como funciona</h2>

            <div className="mt-6 space-y-5 text-sm text-slate-400">
              <Step number="1" title="Configurar fornecedor" text="Na ficha do fornecedor adicionas a marca, desconto e margens." />
              <Step number="2" title="Preparar no Atlas" text="O Atlas adiciona a coluna Novo PrecoTabela." />
              <Step number="3" title="Preencher preço tabela" text="Copias os preços de tabela novos do fornecedor." />
              <Step number="4" title="Gerar final" text="O Atlas aplica o desconto, calcula PrecoCusto e os preços de venda." />
              <Step number="5" title="Importar no Keinvoice" text="A coluna provisória desaparece e o ficheiro fica pronto." />
            </div>
          </Card>

          <Card>
            <h2 className="text-2xl font-semibold text-white">Estado</h2>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              {status === "loading" && "A trabalhar no ficheiro..."}
              {status === "idle" && "Importa um ficheiro para começar."}
              {status === "success" && (message || "Ficheiro analisado com sucesso.")}
              {status === "error" && message}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-bold text-cyan-300">
        {number}
      </div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-1">{text}</p>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Aconteceu um erro inesperado.";
}
