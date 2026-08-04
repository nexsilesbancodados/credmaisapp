import type { Dispatch, RefObject, SetStateAction } from "react";
import type { ModuleKey } from "@/contexts/WhiteLabelContext";

/**
 * Formulário único das configurações do ASSINANTE.
 *
 * Grava em três destinos, e a divisão importa:
 *   - tabela `settings`  → quase tudo (marca, bot, portal, integrações)
 *   - tabela `profiles`  → pix_key, pix_key_type, billing_message
 *   - edge `settings-set-secret` → whatsapp_api_key (a coluna é revogada do
 *     usuário autenticado, então o front nunca escreve nela direto)
 *
 * Campo que existe aqui e não aparece em nenhuma aba vira campo fantasma: é
 * salvo sem ninguém conseguir editar. Foi assim que `hubla_checkout_url` apagou
 * o link de cadastro. Ao adicionar campo aqui, garanta a UI correspondente.
 */
export interface SettingsForm {
  // Empresa e marca
  company_name: string;
  company_cnpj: string;
  company_logo_url: string;
  favicon_url: string;
  primary_color: string;
  accent_color: string;
  theme_mode: string;
  sidebar_style: string;
  login_title: string;
  login_subtitle: string;
  footer_text: string;
  border_radius: string;
  font_family: string;

  // Padrões de empréstimo
  default_interest_rate: string;
  default_late_fee: string;
  default_daily_interest: string;
  default_frequency: string;

  // Integrações
  whatsapp_api_url: string;
  whatsapp_api_key: string;
  whatsapp_instance: string;
  n8n_webhook_url: string;
  push_notifications_enabled: boolean;

  // Perfil (tabela profiles)
  pix_key: string;
  pix_key_type: string;
  billing_message: string;

  // Bot de cobrança
  bot_enabled: boolean;
  bot_auto_send: boolean;
  bot_send_hour: number;
  bot_send_minute: number;
  bot_max_messages_per_day: number;
  bot_work_days: string[];
  bot_escalation_rules: { days: number; template: string; channel: string }[];
  bot_retry_interval_hours: number;
  bot_stop_on_payment: boolean;
  bot_notify_owner: boolean;
  bot_greeting_message: string;
  bot_closing_message: string;
  bot_send_pix: boolean;
  bot_send_receipt: boolean;
  bot_tone: string;
  bot_use_ai: boolean;
  bot_negotiation_enabled: boolean;
  bot_send_audio: boolean;
  bot_process_audio: boolean;
  bot_process_receipts: boolean;
  bot_auto_confirm_payment: boolean;

  // Portal do cliente
  portal_title: string;
  portal_subtitle: string;
  portal_welcome_message: string;
  portal_primary_color: string;
  portal_logo_url: string;
  portal_contact_phone: string;
  portal_contact_email: string;

  // Contrato e módulos
  custom_contract_template: string;
  modules_enabled: Record<ModuleKey, boolean>;
}

/**
 * Tudo que as seções precisam. Um objeto só evita ficar reencanando prop a prop
 * a cada seção nova — e mantém as seções ignorantes de onde os dados vêm.
 */
export interface SettingsCtx {
  form: SettingsForm;
  setForm: Dispatch<SetStateAction<SettingsForm>>;
  inputCls: string;

  /** Linha crua de `settings_safe` — usada para flags como whatsapp_api_key_configured. */
  settings: any;

  // Templates de mensagem
  templates: any[];
  newTemplate: { name: string; content: string; trigger_days: string };
  setNewTemplate: Dispatch<SetStateAction<{ name: string; content: string; trigger_days: string }>>;
  onAddTemplate: () => void | Promise<void>;
  onDeleteTemplate: (id: string) => void | Promise<void>;
  onAddPresetTemplate: (preset: { name: string; content: string; trigger_days: number | null }) => void | Promise<void>;

  // Uploads de imagem
  logoInputRef: RefObject<HTMLInputElement>;
  faviconInputRef: RefObject<HTMLInputElement>;
  portalLogoInputRef: RefObject<HTMLInputElement>;
  onUploadLogo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadFavicon: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadPortalLogo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingLogo: boolean;
  uploadingFavicon: boolean;
  uploadingPortalLogo: boolean;

  /** Aviso curto ao usuário (copiar variável, etc). */
  notify: (title: string) => void;
}

export type SectionProps = { ctx: SettingsCtx };
