import EmpresaSection from "./sections/EmpresaSection";
import PixSection from "./sections/PixSection";
import PadroesSection from "./sections/PadroesSection";
import NotificacoesSection from "./sections/NotificacoesSection";
import MarcaSection from "./sections/MarcaSection";
import ModulosSection from "./sections/ModulosSection";
import PortalSection from "./sections/PortalSection";
import ContratoSection from "./sections/ContratoSection";
import BotSection from "./sections/BotSection";
import TemplatesSection from "./sections/TemplatesSection";
import MensagemSection from "./sections/MensagemSection";
import WhatsAppSection from "./sections/WhatsAppSection";
import WebhooksSection from "./sections/WebhooksSection";
import PwaSection from "./sections/PwaSection";
import type { SettingsCtx } from "./types";

/**
 * Uma aba, um componente. O id aqui é o mesmo usado no menu lateral da página —
 * se os dois deixarem de bater, a aba some da tela em vez de quebrar, então o
 * teste de fumaça percorre esta tabela para garantir que todas renderizam.
 */
export const SECTIONS = {
  empresa: EmpresaSection,
  pix: PixSection,
  padroes: PadroesSection,
  notificacoes: NotificacoesSection,
  marca: MarcaSection,
  modulos: ModulosSection,
  portal: PortalSection,
  contrato: ContratoSection,
  bot: BotSection,
  templates: TemplatesSection,
  mensagem: MensagemSection,
  whatsapp: WhatsAppSection,
  webhooks: WebhooksSection,
  pwa: PwaSection,
} as const;

export type SectionId = keyof typeof SECTIONS;

export const SECTION_IDS = Object.keys(SECTIONS) as SectionId[];

const SectionRenderer = ({ tab, ctx }: { tab: string; ctx: SettingsCtx }) => {
  const Section = SECTIONS[tab as SectionId];
  if (!Section) return null;
  return <Section ctx={ctx} />;
};

export default SectionRenderer;
