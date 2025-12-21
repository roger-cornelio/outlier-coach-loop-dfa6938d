/**
 * CoachPending - Tela para coach com solicitação pendente
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, ArrowLeft } from 'lucide-react';

export default function CoachPending() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,4%)] to-[hsl(0,0%,2%)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, hsl(var(--primary) / 0.15), transparent 60%)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm z-10 text-center"
      >
        <div className="w-20 h-20 mx-auto bg-yellow-500/10 rounded-full flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-yellow-500" />
        </div>

        <h1 className="font-display text-2xl text-foreground mb-3">
          Aguardando Aprovação
        </h1>
        
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Sua solicitação está em análise.<br />
          Você receberá uma notificação assim que for aprovado.
        </p>

        <Link
          to="/login/coach"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-card/40 border border-border/30 text-foreground rounded font-display text-sm hover:bg-card/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
      </motion.div>
    </div>
  );
}
