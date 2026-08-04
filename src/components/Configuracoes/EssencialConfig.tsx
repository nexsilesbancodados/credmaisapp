import { Building, CreditCard, Percent } from "lucide-react";

export const EssencialConfig = ({ form, setForm, inputCls }: { form: any, setForm: any, inputCls: string }) => {
  return (
    <div className="space-y-6">
      <div className="bg-card/50 border border-border/30 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building size={16} className="text-primary" />
          <h3 className="font-semibold text-sm">Dados da Empresa</h3>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome da Empresa</label>
          <input
            value={form.company_name}
            onChange={(e) => setForm((f: any) => ({ ...f, company_name: e.target.value }))}
            className={inputCls}
            placeholder="Nome fantasia"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">CNPJ</label>
          <input
            value={form.company_cnpj}
            onChange={(e) => setForm((f: any) => ({ ...f, company_cnpj: e.target.value }))}
            className={inputCls}
            placeholder="00.000.000/0000-00"
          />
        </div>
      </div>

      <div className="bg-card/50 border border-border/30 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard size={16} className="text-primary" />
          <h3 className="font-semibold text-sm">Chave PIX</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
            <select
              value={form.pix_key_type}
              onChange={(e) => setForm((f: any) => ({ ...f, pix_key_type: e.target.value }))}
              className={inputCls}
            >
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="email">E-mail</option>
              <option value="phone">Telefone</option>
              <option value="random">Aleatória</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Chave</label>
            <input
              value={form.pix_key}
              onChange={(e) => setForm((f: any) => ({ ...f, pix_key: e.target.value }))}
              className={inputCls}
              placeholder="Sua chave PIX"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
