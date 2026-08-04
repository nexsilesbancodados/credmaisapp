/** Paletas prontas oferecidas na aba Marca. */
export const COLOR_PRESETS = [
  { label: "Azul Steel", primary: "#4a86c8", accent: "#6ba3d6", emoji: "🔷" },
  { label: "Azul Royal", primary: "#2563eb", accent: "#3b82f6", emoji: "💎" },
  { label: "Esmeralda", primary: "#059669", accent: "#10b981", emoji: "💚" },
  { label: "Roxo", primary: "#7c3aed", accent: "#8b5cf6", emoji: "💜" },
  { label: "Âmbar", primary: "#d97706", accent: "#f59e0b", emoji: "🟡" },
  { label: "Vermelho", primary: "#dc2626", accent: "#ef4444", emoji: "❤️" },
];

/** Mensagens de cobrança prontas, oferecidas na aba Mensagem Padrão. */
export const BILLING_PRESETS = [
  {
    label: "Formal",
    text: "{empresa}: Sr(a) {nome}, identificamos um atraso em sua parcela de empréstimo. O valor pendente é de {valor}. Por favor, entre em contato para regularizar.",
  },
  {
    label: "Amigável",
    text: "Olá {nome}! 😊 Aqui é da {empresa}. Notamos que sua parcela de {valor} ainda não foi paga. Podemos ajudar? Entre em contato conosco!",
  },
  {
    label: "Urgente",
    text: "⚠️ {empresa} informa: {nome}, sua parcela de {valor} está em atraso. Regularize imediatamente para evitar juros adicionais e restrições no seu CPF.",
  },
];

/** Templates de mensagem prontos, oferecidos na aba Templates. */
export const TEMPLATE_PRESETS: { name: string; content: string; trigger_days: number | null }[] = [
  { name: "Lembrete Amigável", content: "Olá {nome}, tudo bem? 😊 Passando para lembrar que sua parcela de {valor} vence hoje. Qualquer dúvida, estamos à disposição!", trigger_days: 0 },
  { name: "Cobrança 1 Dia", content: "Olá {nome}, notamos que sua parcela de {valor} venceu ontem. Por favor, realize o pagamento o quanto antes para evitar juros adicionais. Obrigado!", trigger_days: 1 },
  { name: "Cobrança 3 Dias", content: "Prezado(a) {nome}, sua parcela de {valor} está com {dias} dias de atraso. Entre em contato para negociarmos. Evite a negativação do seu nome.", trigger_days: 3 },
  { name: "Cobrança 7 Dias", content: "⚠️ {nome}, sua parcela de {valor} está com {dias} dias de atraso. Caso o pagamento não seja regularizado, medidas adicionais poderão ser tomadas. Entre em contato urgente.", trigger_days: 7 },
  { name: "Cobrança 15 Dias", content: "🚨 {nome}, informamos que sua dívida de {valor} com {dias} dias de atraso será encaminhada para negativação. Regularize imediatamente para evitar restrições no seu CPF.", trigger_days: 15 },
  { name: "Cobrança 30 Dias", content: "{nome}, sua dívida de {valor} está com {dias} dias de atraso. Seu nome será incluído nos órgãos de proteção ao crédito. Entre em contato HOJE para negociar e evitar maiores consequências.", trigger_days: 30 },
  { name: "Confirmação de Pagamento", content: "✅ {nome}, confirmamos o recebimento do pagamento de {valor}. Obrigado pela pontualidade! Qualquer dúvida, estamos à disposição.", trigger_days: null },
  { name: "Acordo / Negociação", content: "Olá {nome}, gostaríamos de oferecer uma condição especial para regularizar sua parcela de {valor} em atraso há {dias} dias. Entre em contato para negociarmos. 🤝", trigger_days: null },
];
