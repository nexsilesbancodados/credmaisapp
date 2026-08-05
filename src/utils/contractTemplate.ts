// Substitui placeholders {{chave}} no template do contrato com dados reais.
// Suporta tabela de parcelas via bloco {{#parcelas}}...{{/parcelas}} (cada linha repete por parcela).

export interface ContractPlaceholderData {
  clientName: string;
  cpfCnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  capital: number;
  interestRate: number;
  totalAmount: number;
  totalInterest: number;
  installmentAmount: number;
  numInstallments: number;
  frequency: string;
  startDate: string;
  lateFeePercent: number;
  dailyInterestPercent: number;
  companyName: string;
  companyCnpj: string;
  installments?: { installment_number: number; amount: number; due_date: string }[];

  // O formulário de empréstimo já coletava tudo isto e gravava no contrato, mas
  // nada chegava ao documento: quem pedia avalista gerava um contrato sem o
  // nome do avalista em lugar nenhum — um aval que não vale nada. Idem para
  // garantia, forma de pagamento, carência e desconto de antecipação.
  paymentMethod?: string;
  guaranteeType?: string | null;
  guaranteeDescription?: string | null;
  guarantorName?: string | null;
  guarantorCpf?: string | null;
  guarantorPhone?: string | null;
  gracePeriods?: number;
  graceDays?: number;
  earlyPaymentDiscountPercent?: number;
  maxInterestCapPercent?: number | null;
  companyAddress?: string;
  companyPhone?: string;
}

const fmtMoney = (v: number) =>
  "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => {
  if (!d) return "";
  try {
    // Bare YYYY-MM-DD → parse as local noon to avoid UTC shift
    const iso = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const dt = iso ? new Date(+iso[1], +iso[2] - 1, +iso[3], 12, 0, 0, 0) : new Date(d);
    return dt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return d;
  }
};

export const CONTRACT_PLACEHOLDERS = [
  { key: "cliente_nome", desc: "Nome do cliente" },
  { key: "cliente_cpf", desc: "CPF/CNPJ do cliente" },
  { key: "cliente_telefone", desc: "Telefone" },
  { key: "cliente_whatsapp", desc: "WhatsApp" },
  { key: "cliente_email", desc: "E-mail" },
  { key: "cliente_endereco", desc: "Endereço" },
  { key: "empresa_nome", desc: "Nome da empresa (credor)" },
  { key: "empresa_cnpj", desc: "CNPJ da empresa" },
  { key: "capital", desc: "Valor emprestado" },
  { key: "total", desc: "Total a pagar" },
  { key: "total_juros", desc: "Total de juros" },
  { key: "valor_parcela", desc: "Valor de cada parcela" },
  { key: "num_parcelas", desc: "Quantidade de parcelas" },
  { key: "taxa", desc: "Taxa de juros (%)" },
  { key: "frequencia", desc: "Frequência (Mensal, Quinzenal, etc)" },
  { key: "data_inicio", desc: "Data do 1º vencimento" },
  { key: "multa", desc: "Multa por atraso (%)" },
  { key: "juros_diario", desc: "Juros diário (%)" },
  { key: "data_hoje", desc: "Data de hoje" },
  { key: "data_ultimo_vencimento", desc: "Vencimento da última parcela" },
  { key: "tabela_parcelas", desc: "Tabela completa de parcelas" },
  { key: "forma_pagamento", desc: "Forma de pagamento (PIX, dinheiro…)" },
  { key: "carencia", desc: "Carência antes da 1ª parcela" },
  { key: "desconto_antecipacao", desc: "Desconto por pagamento antecipado (%)" },
  { key: "teto_juros", desc: "Teto dos juros de atraso (%)" },
  { key: "garantia_tipo", desc: "Tipo de garantia (avalista, veículo…)" },
  { key: "garantia_descricao", desc: "Descrição da garantia" },
  { key: "avalista_nome", desc: "Nome do avalista" },
  { key: "avalista_cpf", desc: "CPF do avalista" },
  { key: "avalista_telefone", desc: "Telefone do avalista" },
  { key: "empresa_endereco", desc: "Endereço da empresa (credor)" },
  { key: "empresa_telefone", desc: "Telefone da empresa (credor)" },
];

/**
 * Blocos que só aparecem quando o dado existe.
 *
 * Sem isto, um contrato com cláusula de avalista sairia com os campos em branco
 * para todo cliente que não tem avalista — que é a maioria. Uso:
 *
 *   {{#se_avalista}}O(A) Sr(a). {{avalista_nome}}, CPF {{avalista_cpf}},
 *   figura como AVALISTA...{{/se_avalista}}
 */
export const CONTRACT_CONDITIONS = [
  { key: "se_avalista", desc: "Só aparece quando há avalista" },
  { key: "se_garantia", desc: "Só aparece quando há garantia" },
  { key: "se_carencia", desc: "Só aparece quando há carência" },
  { key: "se_desconto", desc: "Só aparece quando há desconto por antecipação" },
];

const ROTULOS_PAGAMENTO: Record<string, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  boleto: "Boleto",
  transfer: "Transferência bancária",
};

const ROTULOS_GARANTIA: Record<string, string> = {
  aval: "Avalista",
  vehicle: "Veículo",
  property: "Imóvel",
  other: "Outra",
};

/** Nomes de variáveis que o texto usa e o sistema não conhece. */
export function variaveisDesconhecidas(template: string): string[] {
  const conhecidas = new Set([
    ...CONTRACT_PLACEHOLDERS.map((p) => p.key),
    ...CONTRACT_CONDITIONS.map((c) => c.key),
    "parcelas",
    "numero",
    "vencimento",
    "valor",
  ]);
  const achadas = new Set<string>();
  for (const m of String(template || "").matchAll(/\{\{\s*[#/]?\s*([a-z_]+)\s*\}\}/gi)) {
    const chave = m[1].toLowerCase();
    if (!conhecidas.has(chave)) achadas.add(chave);
  }
  return [...achadas];
}

export function renderContractTemplate(template: string, data: ContractPlaceholderData): string {
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const map: Record<string, string> = {
    cliente_nome: data.clientName || "",
    cliente_cpf: data.cpfCnpj || "",
    cliente_telefone: data.phone || "",
    cliente_whatsapp: data.whatsapp || "",
    cliente_email: data.email || "",
    cliente_endereco: data.address || "",
    empresa_nome: data.companyName || "",
    empresa_cnpj: data.companyCnpj || "",
    capital: fmtMoney(data.capital),
    total: fmtMoney(data.totalAmount),
    total_juros: fmtMoney(data.totalInterest),
    valor_parcela: fmtMoney(data.installmentAmount),
    num_parcelas: String(data.numInstallments),
    taxa: `${data.interestRate}%`,
    frequencia: data.frequency,
    data_inicio: fmtDate(data.startDate),
    multa: `${data.lateFeePercent}%`,
    juros_diario: `${data.dailyInterestPercent}%`,
    data_hoje: today,
    data_ultimo_vencimento: fmtDate(
      (data.installments || []).length
        ? data.installments![data.installments!.length - 1].due_date
        : "",
    ),
    forma_pagamento: ROTULOS_PAGAMENTO[String(data.paymentMethod || "").toLowerCase()] || "",
    carencia: data.graceDays
      ? `${data.graceDays} dia(s)`
      : data.gracePeriods
        ? `${data.gracePeriods} período(s)`
        : "",
    desconto_antecipacao: data.earlyPaymentDiscountPercent
      ? `${data.earlyPaymentDiscountPercent}%`
      : "",
    teto_juros: data.maxInterestCapPercent ? `${data.maxInterestCapPercent}%` : "",
    garantia_tipo: ROTULOS_GARANTIA[String(data.guaranteeType || "").toLowerCase()] || "",
    garantia_descricao: data.guaranteeDescription || "",
    avalista_nome: data.guarantorName || "",
    avalista_cpf: data.guarantorCpf || "",
    avalista_telefone: data.guarantorPhone || "",
    empresa_endereco: data.companyAddress || "",
    empresa_telefone: data.companyPhone || "",
  };

  // Tabela de parcelas (texto simples)
  const tabela = (data.installments || [])
    .map(
      (p) =>
        `Parcela ${String(p.installment_number).padStart(2, "0")} — Vencimento ${fmtDate(
          p.due_date,
        )} — ${fmtMoney(Number(p.amount))}`,
    )
    .join("\n");
  map.tabela_parcelas = tabela;

  // Blocos condicionais: o trecho some inteiro quando o dado não existe, em vez
  // de imprimir uma cláusula de avalista com o nome em branco.
  const condicoes: Record<string, boolean> = {
    se_avalista: Boolean(data.guarantorName?.trim()),
    se_garantia: Boolean(
      data.guaranteeType && data.guaranteeType !== "none" &&
      (data.guaranteeDescription?.trim() || data.guarantorName?.trim()),
    ),
    se_carencia: Boolean(data.graceDays || data.gracePeriods),
    se_desconto: Boolean(data.earlyPaymentDiscountPercent),
  };
  let template2 = template;
  for (const [chave, ativo] of Object.entries(condicoes)) {
    const bloco = new RegExp(`\\{\\{#${chave}\\}\\}([\\s\\S]*?)\\{\\{/${chave}\\}\\}`, "g");
    template2 = template2.replace(bloco, (_m, dentro) => (ativo ? dentro : ""));
  }

  // Bloco repetível {{#parcelas}}...{{/parcelas}}
  let result = template2.replace(/\{\{#parcelas\}\}([\s\S]*?)\{\{\/parcelas\}\}/g, (_m, block) => {
    return (data.installments || [])
      .map((p) =>
        block
          .replace(/\{\{numero\}\}/g, String(p.installment_number).padStart(2, "0"))
          .replace(/\{\{vencimento\}\}/g, fmtDate(p.due_date))
          .replace(/\{\{valor\}\}/g, fmtMoney(Number(p.amount))),
      )
      .join("");
  });

  // Substituições simples
  result = result.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key) =>
    map[key.toLowerCase()] !== undefined ? map[key.toLowerCase()] : `{{${key}}}`,
  );

  return result;
}

export const DEFAULT_CONTRACT_TEMPLATE = `CONTRATO DE EMPRÉSTIMO PESSOAL

CREDOR: {{empresa_nome}} — CNPJ {{empresa_cnpj}}
DEVEDOR(A): {{cliente_nome}} — CPF/CNPJ {{cliente_cpf}}
Endereço: {{cliente_endereco}}
Telefone: {{cliente_telefone}} — E-mail: {{cliente_email}}

1. OBJETO
Empréstimo pessoal no valor de {{capital}}, concedido pelo CREDOR ao(à) DEVEDOR(A) nas condições deste instrumento.

2. CONDIÇÕES FINANCEIRAS
- Capital: {{capital}}
- Taxa: {{taxa}} ({{frequencia}})
- Parcelas: {{num_parcelas}}x de {{valor_parcela}}
- Total de juros: {{total_juros}}
- Total a pagar: {{total}}
- 1º vencimento: {{data_inicio}}

3. CRONOGRAMA
{{tabela_parcelas}}

4. FORMA DE PAGAMENTO
Os pagamentos serão feitos por {{forma_pagamento}}, na data de cada vencimento.
{{#se_carencia}}Fica concedida carência de {{carencia}} antes da primeira parcela.
{{/se_carencia}}
5. PENALIDADES POR ATRASO
- Juros diários: {{juros_diario}} ao dia sobre o valor acumulado.
{{#se_desconto}}
6. PAGAMENTO ANTECIPADO
A quitação antecipada dá direito a desconto de {{desconto_antecipacao}}, além da
redução proporcional dos juros futuros, na forma do art. 52, §2º do CDC.
{{/se_desconto}}
{{#se_avalista}}
7. AVAL
{{avalista_nome}}, inscrito(a) no CPF sob o nº {{avalista_cpf}}, telefone
{{avalista_telefone}}, assina este instrumento na qualidade de AVALISTA,
respondendo solidariamente pelo cumprimento das obrigações aqui assumidas.
{{/se_avalista}}
{{#se_garantia}}
8. GARANTIA
Tipo: {{garantia_tipo}}. {{garantia_descricao}}
{{/se_garantia}}
9. DISPOSIÇÕES GERAIS
9.1 O DEVEDOR(A) compromete-se a efetuar o pagamento nas datas estabelecidas.
9.2 O pagamento antecipado é permitido com desconto proporcional dos juros futuros.
9.3 Fica eleito o foro da comarca do CREDOR para dirimir litígios.

_______________, {{data_hoje}}


_____________________________            _____________________________
{{empresa_nome}} (Credor)                 {{cliente_nome}} (Devedor/a)
{{#se_avalista}}

_____________________________
{{avalista_nome}} (Avalista)
{{/se_avalista}}`;
