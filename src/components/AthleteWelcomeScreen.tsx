/**
 * ATHLETE WELCOME SCREEN
 * 
 * IMPORTANTE: Esta tela é exibida APENAS durante o setup inicial,
 * após o usuário selecionar o coach_style pela primeira vez.
 * 
 * NUNCA deve aparecer para usuários com setup completo.
 * Auto-avança para config após 10s (apenas no primeiro setup).
 */
import { useEffect, useState, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Flame, Heart, Zap } from 'lucide-react';
import type { CoachStyle } from '@/types/outlier';
import { getCoachCopy } from '@/config/coachCopy';

const coachIcons: Record<CoachStyle, React.ReactNode> = {
  IRON: <Flame className="w-6 h-6" />,
  PULSE: <Heart className="w-6 h-6" />,
  SPARK: <Zap className="w-6 h-6" />,
};

export const AthleteWelcomeScreen = forwardRef<HTMLDivElement>(function AthleteWelcomeScreen(_props, ref) {
  const { coachStyle, setCurrentView } = useOutlierStore();
  const { user, profile, loading: authLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  const athleteName = profile?.name || user?.email?.split('@')[0] || '';
  const coachCopy = coachStyle ? getCoachCopy(coachStyle).welcomeScreen : null;
  const coachIcon = coachStyle ? coachIcons[coachStyle] : null;

  // Check if data is ready
  useEffect(() => {
    if (!authLoading && user && coachStyle) {
      setIsReady(true);
    }
  }, [authLoading, user, coachStyle]);

  // Auto-advance to config after 10s (setup inicial only)
  // Esta tela só aparece no primeiro setup, então o auto-advance é seguro
  useEffect(() => {
    if (!isReady) return;

    const timer = setTimeout(() => {
      console.log(`[NAV][AthleteWelcomeScreen] from_view=athleteWelcome to_view=config first_setup_completed=${profile?.first_setup_completed} coachStyle=${coachStyle} reason=auto_advance_10s_timer ts=${new Date().toISOString()}`);
      setCurrentView('config');
    }, 10000);

    return () => clearTimeout(timer);
  }, [isReady, setCurrentView, profile?.first_setup_completed, coachStyle]);

  // Show loader while data isn't ready
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div ref={ref} className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: 'var(--gradient-glow)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center z-10 max-w-xl w-full"
      >
        {/* A) Linha 1 - Menor destaque */}
        <motion.p 
          className="font-display text-xl md:text-2xl tracking-wide text-muted-foreground mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          PARABÉNS, {athleteName.toUpperCase()}.
        </motion.p>

        {/* B) Headline principal - Maior destaque */}
        <motion.h1 
          className="font-display text-3xl md:text-5xl lg:text-6xl tracking-wider font-bold text-gradient-logo mb-10"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          VOCÊ ESTÁ PRESTES A SE TORNAR OUTLIER.
        </motion.h1>

        {/* D) Card do Coach - Destaque forte, mostra valor da personalização */}
        {coachCopy && (
          <motion.div
            className="card-elevated p-8 md:p-12 text-left max-w-xl mx-auto border-2 border-primary/30 shadow-2xl shadow-primary/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {/* Coach header - Maior destaque */}
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border/50">
              <div className="p-4 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/50">
                {coachIcon}
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Seu Coach</p>
                <p className="font-display text-3xl md:text-4xl tracking-wide text-foreground">{coachStyle}</p>
              </div>
            </div>

            {/* What you'll feel - Texto maior */}
            <p className="text-base text-muted-foreground mb-4 font-medium">
              {coachCopy?.coachCardIntro || 'O que você vai sentir nessa experiência:'}
            </p>
            
            <ul className="space-y-3 mb-6">
              {coachCopy?.bullets.map((bullet, index) => (
                <motion.li 
                  key={index}
                  className="flex items-start gap-3 text-foreground"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                >
                  <span className="text-primary text-lg mt-0.5">•</span>
                  <span className="text-base md:text-lg">{bullet}</span>
                </motion.li>
              ))}
            </ul>

            {/* Footer line - Mais impacto */}
            <motion.p 
              className="text-base md:text-lg text-primary font-semibold italic border-t border-primary/30 pt-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              "{coachCopy?.footer}"
            </motion.p>
          </motion.div>
        )}

        {/* Institutional note - treino vs feedback */}
        {coachCopy && (
          <motion.p
            className="text-sm text-muted-foreground mt-8 max-w-md mx-auto text-center leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
          >
            {coachCopy.institutionalNote}
          </motion.p>
        )}

        {/* Loading indicator */}
        <motion.p
          className="text-xs text-muted-foreground/60 mt-6 tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
        >
          ajustando sua experiência...
        </motion.p>
      </motion.div>
    </div>
  );
});

AthleteWelcomeScreen.displayName = 'AthleteWelcomeScreen';
