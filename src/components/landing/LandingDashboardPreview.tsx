const bars = [40, 62, 48, 80, 56, 90, 70, 86, 66, 95, 76, 100];

const activities = [
  { name: "Ana Ribeiro", info: "Parcela 4/12 recebida", value: "+ R$ 640,00", positive: true },
  { name: "Pedro Alves", info: "Novo contrato aprovado", value: "R$ 8.000,00", positive: true },
  { name: "Renata Dias", info: "Cobrança enviada · WhatsApp", value: "R$ 1.150,00", positive: true },
  { name: "Marcos Pinto", info: "Parcela 2/6 em atraso", value: "R$ 980,00", positive: false },
];

const LandingDashboardPreview = () => {
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="max-w-2xl mb-12 lg:mb-14">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-3">
            O painel
          </p>
          <h2 className="text-[clamp(1.75rem,3.6vw,2.75rem)] font-bold text-foreground leading-tight">
            Toda a sua operação em uma única tela.
          </h2>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            Quanto você tem na rua, quanto entra hoje e quanto está atrasado. Números atualizados em tempo
            real para você decidir em segundos.
          </p>
        </div>

        <div className="rounded-[2rem] border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 h-12 px-5 border-b border-border bg-secondary/60">
            <div className="flex gap-1.5" aria-hidden>
              <span className="w-2.5 h-2.5 rounded-full bg-border" />
              <span className="w-2.5 h-2.5 rounded-full bg-border" />
              <span className="w-2.5 h-2.5 rounded-full bg-border" />
            </div>
            <span className="mx-auto text-[11px] text-subtle bg-card border border-border rounded-full px-4 py-1">
              credmaisapp.com.br/dashboard
            </span>
          </div>

          <div className="p-5 sm:p-8 lg:p-10 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Capital na rua", value: "R$ 1.240.500,00" },
                { label: "Entra hoje", value: "R$ 15.420,00", accent: "text-primary" },
                { label: "Em atraso (30d)", value: "R$ 4.120,00", accent: "text-destructive" },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-border p-5">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-subtle font-semibold mb-2">
                    {card.label}
                  </p>
                  <p className={`tnum text-xl sm:text-2xl font-bold ${card.accent ?? "text-foreground"}`}>
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border p-5 sm:p-6">
                <p className="text-xs font-semibold text-muted-foreground mb-6">Fluxo de caixa (12 meses)</p>
                <div className="h-44 flex items-end gap-1.5">
                  {bars.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-primary/25 to-primary/70"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border p-5 sm:p-6">
                <p className="text-xs font-semibold text-muted-foreground mb-4">Últimas atividades</p>
                <ul className="divide-y divide-border">
                  {activities.map((a) => (
                    <li key={a.name} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                        <p className="text-[11px] text-subtle truncate">{a.info}</p>
                      </div>
                      <span
                        className={`tnum text-sm font-semibold flex-shrink-0 ${
                          a.positive ? "text-foreground" : "text-destructive"
                        }`}
                      >
                        {a.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingDashboardPreview;
