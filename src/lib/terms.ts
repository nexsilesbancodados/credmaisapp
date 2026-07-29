/**
 * Dicionário canônico de termos do CredMais App.
 * Use estes valores em qualquer texto visível ao usuário para garantir
 * consistência entre telas. Nunca use sinônimos ("Cobrança" em vez de
 * "Parcela", "Devedor" em vez de "Cliente", etc.).
 */

export const TERMS = {
  // Entidades principais
  client: "Cliente",
  clientPlural: "Clientes",
  contract: "Contrato",
  contractPlural: "Contratos",
  installment: "Parcela",
  installmentPlural: "Parcelas",
  investor: "Investidor",
  collector: "Cobrador",

  // Ações canônicas (verbo no infinitivo)
  actionNew: "Novo",
  actionEdit: "Editar",
  actionDelete: "Excluir",
  actionReceive: "Receber",
  actionSend: "Enviar cobrança",
  actionRenegotiate: "Renegociar",
  actionView: "Ver detalhes",

  // Status de parcela
  statusPaid: "Recebida",
  statusDue: "A receber",
  statusPartial: "Parcial",
  statusOverdue: "Em atraso",
  statusScheduled: "Agendada",

  // Status de contrato
  contractActive: "Ativo",
  contractPaid: "Quitado",
  contractOverdue: "Inadimplente",
  contractCancelled: "Cancelado",

  // Status de cliente
  clientActive: "Ativo",
  clientInactive: "Sem contratos",

  // KPIs
  kpiReceived: "Recebido",
  kpiToReceive: "A receber",
  kpiOverdue: "Em atraso",
  kpiProfit: "Lucro",
  kpiCapital: "Capital emprestado",
} as const;

export type TermKey = keyof typeof TERMS;

/** Retorna singular ou plural com base em contagem. */
export const pluralize = (
  count: number,
  singular: string,
  plural: string,
): string => (count === 1 ? singular : plural);
