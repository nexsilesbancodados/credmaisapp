import { motion } from "framer-motion";
import { Users, FileText, BarChart3, Bell, Shield, Smartphone } from "lucide-react";

const features = [
  {
    title: "Cada cliente na palma da mão",
    description: "Histórico, contratos, pagamentos e risco de calote em uma única ficha. Você sabe com quem está lidando antes de liberar o dinheiro.",
    icon: <Users size={24} className="text-white/60" />,
  },
  {
    title: "Nenhuma parcela esquecida",
    description: "Vencimentos, pagamentos parciais, juros e multa calculados sozinhos. Abra o app e veja exatamente quem paga hoje e quem está atrasado.",
    icon: <FileText size={24} className="text-white/60" />,
  },
  {
    title: "Saiba quanto está lucrando",
    description: "Capital na rua, lucro realizado e inadimplência em tempo real. Decisões com número na mão, não no achismo.",
    icon: <BarChart3 size={24} className="text-white/60" />,
  },
  {
    title: "Cobrança que trabalha por você",
    description: "Lembretes e cobranças automáticas no WhatsApp, com link de pagamento. Você recebe mais rápido sem desgastar a relação com o cliente.",
    icon: <Bell size={24} className="text-white/60" />,
  },
  {
    title: "Seus dados a salvo",
    description: "Criptografia, acesso restrito e backup diário na nuvem. Sua carteira não depende mais de um caderno ou de um celular perdido.",
    icon: <Shield size={24} className="text-white/60" />,
  },
  {
    title: "Sua operação onde você estiver",
    description: "Funciona no celular, tablet e computador, como um aplicativo instalado. Feche contrato e receba pagamento na rua, sem voltar para o escritório.",
    icon: <Smartphone size={24} className="text-white/60" />,
  },
];

const LandingFeatures = () => {
  return (
    <section id="features" className="py-24 relative overflow-hidden bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-display font-bold text-white mb-6"
          >
            Menos planilha, <br /> mais <span className="text-gradient-gold">dinheiro no caixa</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/40 max-w-2xl mx-auto"
          >
            Tudo o que você precisa para controlar sua carteira, cobrar no tempo certo e reduzir o calote — sem complicação e sem depender de ninguém.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:bg-white/[0.04] hover:border-blue-500/30 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-4">{feature.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingFeatures;
