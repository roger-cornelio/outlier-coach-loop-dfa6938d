import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowRight, Target, Brain, BarChart3, Zap, Users, 
  TrendingUp, Shield, Activity, ChevronRight, Quote
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

const transformations = [
  {
    name: 'Marcos Oliveira',
    city: 'São Paulo',
    from: { level: 'Open', time: '1:32:45' },
    to: { level: 'Pro', time: '1:18:22' },
    improvement: '14:23',
    stations: ['Sled Push', 'SkiErg', 'Wall Balls'],
    progress: 72,
    quote: 'O diagnóstico mostrou exatamente onde eu estava perdendo tempo. Em 3 meses, cortei 14 minutos do meu tempo.',
    initials: 'MO',
  },
  {
    name: 'Carolina Mendes',
    city: 'Rio de Janeiro',
    from: { level: 'Pro', time: '1:12:30' },
    to: { level: 'Elite', time: '0:59:15' },
    improvement: '13:15',
    stations: ['Rowing', 'Burpee Broad Jump', 'Farmers Carry'],
    progress: 88,
    quote: 'Meu coach recebeu o mapa completo e montou treinos cirúrgicos. Nunca evoluí tão rápido.',
    initials: 'CM',
  },
  {
    name: 'Rafael Teixeira',
    city: 'Belo Horizonte',
    from: { level: 'Open', time: '1:45:10' },
    to: { level: 'Open', time: '1:28:40' },
    improvement: '16:30',
    stations: ['Sled Pull', 'SkiErg', 'Sandbag Lunges'],
    progress: 55,
    quote: 'Achava que meu problema era cardio, mas o diagnóstico mostrou que eram as estações. Mudou tudo.',
    initials: 'RT',
  },
];
export default function Landing() {
  const { user } = useAuth();
  // If logged in, diagnostic CTA goes directly; if not, goes to signup with redirect
  const diagnosticHref = user ? '/diagnostico-gratuito' : '/login?mode=signup&redirect=/diagnostico-gratuito';

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden">
      {/* ══════════ HEADER FIXO ══════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 py-5 md:py-6 flex items-center justify-between">
          <OutlierWordmark size="md" />
          <div className="flex items-center gap-4 md:gap-6">
            <Link to="/login" className="font-display text-sm md:text-base tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
              Já Sou Outlier
              <ArrowRight className="w-4 h-4" />
            </Link>
            <span className="h-5 border-r border-border/40" />
            <Link to="/login/coach" className="font-display text-sm md:text-base tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
              Sou Coach
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════ HERO ══════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-32 pt-36 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'var(--gradient-glow)' }} />

        <motion.p
          className="font-display text-lg md:text-2xl tracking-[0.3em] text-muted-foreground mb-2 uppercase"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        >
          Performance que separa
        </motion.p>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <OutlierWordmark size="hero" />
        </motion.div>

        <motion.p
          className="font-display text-lg md:text-2xl tracking-[0.3em] text-muted-foreground mt-2 uppercase"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
        >
          do comum
        </motion.p>

        <motion.p
          className="text-muted-foreground text-sm md:text-base mt-8 max-w-md mx-auto leading-relaxed"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        >
          Diagnóstico gratuito + treino personalizado por estação. Cada rep com propósito, cada sessão atacando seus pontos fracos.
        </motion.p>

        <motion.div
          className="flex justify-center mt-16"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        >
          <Link to={diagnosticHref}
            className="font-display text-lg tracking-widest px-12 py-5 rounded-xl bg-primary text-primary-foreground hover:brightness-110 hover:scale-105 transition-all duration-200 shadow-2xl shadow-primary/50 ring-2 ring-primary/40 flex items-center gap-3 justify-center">
            <Zap className="w-6 h-6" />
            RECEBER DIAGNÓSTICO
          </Link>
        </motion.div>

        <motion.div
          className="mt-5 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
        >
          <Link to="/login?mode=signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
            Ainda não realizei prova oficial
          </Link>
        </motion.div>
      </section>

      {/* ══════════ PROBLEMA / SOLUÇÃO ══════════ */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <motion.h2
          className="font-display text-2xl md:text-4xl tracking-widest text-center text-foreground mb-16"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
        >
          POR QUE <span className="text-primary">OUTLIER</span>?
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: 'Treino personalizado por diagnóstico', desc: 'Seu treino é adaptado automaticamente com base nos seus splits reais. Mais volume onde você precisa, menos onde já domina.' },
            { icon: Activity, title: 'Motor de proporção inteligente', desc: 'Cada estação recebe um peso tático baseado no impacto real no seu tempo final. Não é achismo — é ciência aplicada.' },
            { icon: TrendingUp, title: 'Coach + IA trabalhando juntos', desc: 'Seu coach revisa e aprova os ajustes antes de publicar. Você recebe o melhor dos dois mundos: tecnologia e olhar humano.' },
          ].map((item, i) => (
            <motion.div key={i}
              className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
              <item.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-display text-base tracking-wide text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════ COMO FUNCIONA ══════════ */}
      <section className="px-6 py-20 bg-card/50">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            className="font-display text-2xl md:text-4xl tracking-widest text-center text-foreground mb-16"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            COMO FUNCIONA
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Faça o diagnóstico grátis', desc: 'Importe seu resultado HYROX e descubra exatamente quais estações estão custando mais tempo.' },
              { step: '02', title: 'Receba treino personalizado', desc: 'O motor de proporção calcula o foco ideal por estação. Seu coach revisa e publica com um clique.' },
              { step: '03', title: 'Evolua com dados reais', desc: 'Volume ajustado automaticamente às suas fraquezas. Feedback em tempo real. Progressão mensurável.' },
            ].map((item, i) => (
              <motion.div key={i} className="text-center"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
                <span className="font-display text-5xl text-primary/30">{item.step}</span>
                <h3 className="font-display text-lg tracking-wide text-foreground mt-2 mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ NÚMEROS — MÉTRICAS DE IMPACTO ══════════ */}
      <section className="px-6 py-16 bg-card/50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: 500, suffix: '+', label: 'Diagnósticos gerados' },
            { value: 12, suffix: 'min', label: 'Melhoria média identificada' },
            { value: 98, suffix: '%', label: 'Precisão do diagnóstico' },
            { value: 3, suffix: '', label: 'Open · Pro · Elite' },
          ].map((item, i) => (
            <motion.div key={i}
              className="p-5 rounded-xl bg-card border border-border text-center"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
              <p className="font-display text-3xl md:text-4xl text-primary">
                <AnimatedCounter target={item.value} suffix={item.suffix} />
              </p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 tracking-wide">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════ ANTES & DEPOIS ══════════ */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <motion.h2
          className="font-display text-2xl md:text-4xl tracking-widest text-center text-foreground mb-16"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
        >
          TRANSFORMAÇÕES <span className="text-primary">REAIS</span>
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {transformations.map((t, i) => (
            <motion.div key={i}
              className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-display text-sm tracking-wide text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.city}</p>
                </div>
                <span className="text-[10px] font-display tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md">
                  {t.from.level} → {t.to.level}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Antes</p>
                  <p className="font-display text-lg text-muted-foreground line-through">{t.from.time}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Depois</p>
                  <p className="font-display text-lg text-foreground">{t.to.time}</p>
                </div>
              </div>

              <Progress value={t.progress} className="h-1.5 mb-3" />

              <p className="text-primary font-display text-sm tracking-wide mb-2">-{t.improvement}</p>
              <div className="flex flex-wrap gap-1">
                {t.stations.map((s, j) => (
                  <span key={j} className="text-[10px] text-muted-foreground bg-secondary/50 rounded px-1.5 py-0.5">{s}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════ DEPOIMENTOS ══════════ */}
      <section className="px-6 py-20 bg-card/50">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            className="font-display text-2xl md:text-4xl tracking-widest text-center text-foreground mb-16"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            QUEM JÁ É <span className="text-primary">OUTLIER</span>
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={i}
                className="p-6 rounded-2xl bg-card border border-border relative"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
                <Quote className="w-8 h-8 text-primary/20 absolute top-4 right-4" />
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display text-xs">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-display tracking-wide text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.city} · {t.category}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ DIFERENCIAIS ══════════ */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <motion.h2
          className="font-display text-2xl md:text-4xl tracking-widest text-center text-foreground mb-16"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
        >
          O QUE VOCÊ <span className="text-primary">RECEBE</span>
        </motion.h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Activity, label: 'Diagnóstico Gratuito' },
            { icon: Target, label: 'Treino Personalizado por Estação' },
            { icon: Brain, label: 'Motor de Adaptação Inteligente' },
            { icon: TrendingUp, label: 'Evolução Mensurável' },
          ].map((item, i) => (
            <motion.div key={i}
              className="p-5 rounded-xl bg-secondary/50 border border-border text-center hover:border-primary/30 transition-colors"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
              <item.icon className="w-6 h-6 text-primary mx-auto mb-3" />
              <p className="font-display text-xs md:text-sm tracking-wide text-foreground">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════ PARA COACHES ══════════ */}
      <section className="px-6 py-20 bg-card/50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="p-8 md:p-12 rounded-2xl border-2 border-primary/20 bg-card relative overflow-hidden"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

            <div className="flex items-center gap-3 mb-6">
              <Users className="w-8 h-8 text-primary" />
              <h2 className="font-display text-2xl md:text-3xl tracking-widest text-foreground">PARA COACHES</h2>
            </div>

            <p className="text-lg text-foreground mb-6 font-medium">
              Escale sua operação sem perder a qualidade 1:1.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                'Motor adapta volume por atleta automaticamente',
                'Você revisa e aprova antes de publicar',
                'Diagnóstico individual alimenta os ajustes',
                'Publicação personalizada com 1 clique',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link to="/coach-request"
                className="inline-flex items-center gap-3 font-display text-base tracking-widest px-8 py-4 rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-lg shadow-primary/30">
                QUERO SER COACH OUTLIER
                <ArrowRight className="w-5 h-5" />
              </Link>
              <span className="text-[10px] tracking-wider text-muted-foreground/60 uppercase font-display border border-border/40 rounded-lg px-3 py-1.5">
                ⬥ Aprovação sujeita aos requisitos OUTLIER
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════ CTA FINAL ══════════ */}
      <section className="px-6 py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'var(--gradient-glow)' }} />

        <motion.div className="relative z-10 flex flex-col items-center"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <p className="font-display text-xl md:text-2xl tracking-widest text-muted-foreground mb-4">PRONTO PARA SER</p>
          <div className="mb-10">
            <OutlierWordmark size="xl" />
          </div>

          <Link to="/login?mode=signup"
            className="inline-flex items-center gap-3 font-display text-xl tracking-widest px-16 py-6 rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-xl shadow-primary/40 ring-2 ring-primary/40">
            <Zap className="w-5 h-5" />
            COMECE AGORA
          </Link>
        </motion.div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="px-6 py-8 border-t border-border text-center">
        <OutlierWordmark size="sm" className="mb-4" />
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-4">
          <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
          <Link to="/coach-request" className="hover:text-foreground transition-colors">Coach</Link>
        </div>
        <p className="text-xs text-muted-foreground/50">© {new Date().getFullYear()} OUTLIER. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
