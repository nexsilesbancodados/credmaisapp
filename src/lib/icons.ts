/**
 * Ícones canônicos do CredMais App — um ícone por conceito.
 * Sempre importe daqui em vez de escolher ad-hoc no lucide.
 */
import {
  Users,
  User,
  FileText,
  CalendarClock,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  MessageCircle,
  Landmark,
  Bell,
  Settings,
  Plus,
  Search,
  LayoutDashboard,
  BarChart3,
  DollarSign,
  Receipt,
  Bot,
  Crown,
  Shield,
  LifeBuoy,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

export const ICONS = {
  // Navegação principal
  home: LayoutDashboard,
  analytics: BarChart3,
  clients: Users,
  client: User,
  contracts: FileText,
  installments: CalendarClock,
  receipts: Receipt,
  wallet: Wallet,
  investors: Landmark,
  profit: TrendingUp,
  expense: DollarSign,

  // Ações
  add: Plus,
  search: Search,
  notify: Bell,
  message: MessageCircle,
  bot: Bot,

  // Status
  ok: CheckCircle2,
  pending: Clock,
  alert: AlertTriangle,
  fail: XCircle,

  // Sistema
  ai: Sparkles,
  settings: Settings,
  admin: Crown,
  audit: Shield,
  support: LifeBuoy,
} as const;

export type IconKey = keyof typeof ICONS;
