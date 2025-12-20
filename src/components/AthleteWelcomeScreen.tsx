/**
 * ATHLETE WELCOME SCREEN
 * Exibido após login/seleção de coach
 * Auto-avança após 15s
 */
import { useEffect, useState } from 'react';
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

export function AthleteWelcomeScreen() {
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

  // Auto-advance after 2.4s when ready
  useEffect(() => {
    if (!isReady) return;

    const timer = setTimeout(() => {
      setCurrentView('config');
    }, 15000);

    return () => clearTimeout(timer);
  }, [isReady, setCurrentView]);

  // Show loader while data isn't ready
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
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
        {/* A) Headline - Maior destaque */}
        <motion.h1 
          className="font-display text-4xl md:text-6xl tracking-wider font-bold text-gradient-logo mb-6"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {coachCopy?.headline || 'SEJA BEM-VINDO, OUTLIER'}
        </motion.h1>

        {/* B) Nome do atleta - Destaque forte */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/20 border border-primary/40 text-primary font-display text-2xl md:text-3xl tracking-wide shadow-lg shadow-primary/20">
            {athleteName} 👊
          </span>
        </motion.div>

        {/* C) Subtítulo curto - personalizado por coach */}
        <motion.p 
          className="text-lg md:text-xl text-muted-foreground mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {coachCopy?.subheadline || 'A partir de agora, você é OUTLIER.'}
        </motion.p>

        {/* D) Card do Coach - Maior */}
        {coachCopy && (
          <motion.div
            className="card-elevated p-8 md:p-10 text-left max-w-lg mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {/* Coach header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/40">
                {coachIcon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seu Coach</p>
                <p className="font-display text-xl tracking-wide text-foreground">{coachStyle}</p>
              </div>
            </div>

            {/* What you'll feel */}
            <p className="text-sm text-muted-foreground mb-3">
              {coachCopy?.coachCardIntro || 'O que você vai sentir nessa experiência:'}
            </p>
            
            <ul className="space-y-2 mb-5">
              {coachCopy?.bullets.map((bullet, index) => (
                <motion.li 
                  key={index}
                  className="flex items-start gap-2 text-foreground"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                >
                  <span className="text-primary mt-1">•</span>
                  <span className="text-sm">{bullet}</span>
                </motion.li>
              ))}
            </ul>

            {/* Footer line */}
            <motion.p 
              className="text-sm text-primary font-medium italic border-t border-border/50 pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              {coachCopy?.footer}
            </motion.p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
