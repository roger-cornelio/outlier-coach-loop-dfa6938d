import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';
import { 
  ArrowRight, Target, Brain, BarChart3, Zap, Users, 
  TrendingUp, Shield, Activity, ChevronRight, Quote
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

export default function Landing() {
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
          Receba seu diagnóstico gratuito e descubra, com clareza, onde está seu maior potencial de evolução.
        </motion.p>

        <motion.div
          className="flex justify-center mt-16"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        >
          <Link to="/diagnostico-gratuito"
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
            { icon: Shield, title: 'Coach dedicado com dados reais', desc: 'Seu coach recebe um mapa completo da sua performance e monta treinos que atacam exatamente seus pontos fracos.' },
            { icon: Activity, title: 'Acompanhamento em tempo real', desc: 'Cada treino gera dados que alimentam seu diagnóstico. Seu coach e você enxergam tudo, sem achismo.' },
            { icon: TrendingUp, title: 'Evolução visível, feedbacks precisos', desc: 'Acompanhe sua progressão semana a semana com análises baseadas nos seus splits reais, não em fórmulas genéricas.' },
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
              { step: '01', title: 'Faça o diagnóstico grátis', desc: 'Importe seu resultado HYROX e descubra seus pontos fracos em segundos.' },
              { step: '02', title: 'Conecte-se a um coach', desc: 'Um coach dedicado recebe seu diagnóstico e monta treinos específicos para você.' },
              { step: '03', title: 'Evolua com acompanhamento real', desc: 'Seu coach ajusta os treinos. Nós te damos feedback em tempo real. Você evolui com dados.' },
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
            { icon: Users, label: 'Coach Dedicado' },
            { icon: Brain, label: 'Feedback IA em Tempo Real' },
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
              Escale sua operação com mais qualidade.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                'Novos atletas toda semana',
                'Gestão completa de atletas',
                'Métricas de retenção e engajamento',
                'Publicação de treinos com 1 clique',
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
