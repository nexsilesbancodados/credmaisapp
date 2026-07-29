import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: Crumb[];
  actions?: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}

export const PageHeader = ({
  title,
  subtitle,
  breadcrumb,
  actions,
  icon: Icon,
  className,
}: PageHeaderProps) => (
  <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6", className)}>
    <div className="min-w-0">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-[11px] text-muted-foreground/70 mb-1.5">
          {breadcrumb.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {c.to ? (
                <Link to={c.to} className="hover:text-foreground transition-colors">
                  {c.label}
                </Link>
              ) : (
                <span>{c.label}</span>
              )}
              {i < breadcrumb.length - 1 && <ChevronRight size={11} className="opacity-50" />}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="w-9 h-9 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
            <Icon size={17} className="text-primary" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12.5px] text-muted-foreground/80 leading-tight truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
  </header>
);
