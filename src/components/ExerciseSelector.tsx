/**
 * ExerciseSelector - Autocomplete combobox for exercise selection.
 * Searches global_exercises + coach's custom_exercises.
 * If exercise not found, shows "New Exercise" flow with pattern selection.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Dumbbell, ArrowUp, ArrowDown, Footprints, Move, Bike, Target } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ExerciseOption } from '@/hooks/useExerciseLibrary';
import type { MovementPattern } from '@/utils/energyCalculator';

// ============================================
// PATTERN VISUAL CONFIG
// ============================================

interface PatternConfig {
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const PATTERN_VISUALS: Record<string, PatternConfig> = {
  'Squat': {
    label: 'Squat',
    icon: <ArrowDown className="w-4 h-4" />,
    description: 'Agachamento, Wall Ball, Thruster',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  'Hinge': {
    label: 'Hinge',
    icon: <ArrowUp className="w-4 h-4" />,
    description: 'Deadlift, KB Swing, RDL',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  'Push': {
    label: 'Push',
    icon: <Dumbbell className="w-4 h-4" />,
    description: 'Push-up, Bench, Shoulder Press',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  'Pull': {
    label: 'Pull',
    icon: <ArrowDown className="w-4 h-4" />,
    description: 'Pull-up, Row, Muscle-up',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  'Lunge': {
    label: 'Lunge',
    icon: <Footprints className="w-4 h-4" />,
    description: 'Lunge, Step-up, Box Jump',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  'Horizontal Friction': {
    label: 'Sled / Fricção',
    icon: <Move className="w-4 h-4" />,
    description: 'Sled Push, Sled Pull',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  'Carry': {
    label: 'Carry',
    icon: <Move className="w-4 h-4" />,
    description: 'Farmer Carry, Sandbag',
    color: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  },
  'Cardio': {
    label: 'Cardio',
    icon: <Bike className="w-4 h-4" />,
    description: 'Corrida, Remo, Bike, SkiErg',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  'Core': {
    label: 'Core',
    icon: <Target className="w-4 h-4" />,
    description: 'Sit-up, Plank, Russian Twist',
    color: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  },
  'Olympic Lift': {
    label: 'Olímpico',
    icon: <Dumbbell className="w-4 h-4" />,
    description: 'Clean, Snatch, C&J',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
};

// ============================================
// COMPONENT
// ============================================

interface ExerciseSelectorProps {
  value: string;
  onChange: (name: string) => void;
  exercises: ExerciseOption[];
  patterns: MovementPattern[];
  onCreateCustom?: (name: string, patternId: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}

export function ExerciseSelector({
  value,
  onChange,
  exercises,
  patterns,
  onCreateCustom,
  placeholder = 'Movimento',
  className = '',
}: ExerciseSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [creatingPattern, setCreatingPattern] = useState(false);

  // Filter exercises based on search
  const filtered = useMemo(() => {
    if (!search.trim()) return exercises.slice(0, 15);
    const s = search.toLowerCase();
    return exercises.filter(ex => ex.name.toLowerCase().includes(s)).slice(0, 15);
  }, [search, exercises]);

  // Check if typed name exists
  const isNewExercise = useMemo(() => {
    if (!search.trim() || search.trim().length < 2) return false;
    return !exercises.some(ex => ex.name.toLowerCase() === search.trim().toLowerCase());
  }, [search, exercises]);

  const handleSelect = useCallback((name: string) => {
    onChange(name);
    setSearch('');
    setOpen(false);
    setShowNewExercise(false);
  }, [onChange]);

  const handleCreateCustom = useCallback(async (patternId: string) => {
    if (!onCreateCustom || !search.trim()) return;
    setCreatingPattern(true);
    try {
      await onCreateCustom(search.trim(), patternId);
      handleSelect(search.trim());
    } catch (e) {
      console.error('Failed to create custom exercise:', e);
    } finally {
      setCreatingPattern(false);
    }
  }, [onCreateCustom, search, handleSelect]);

  return (
    <Popover open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) setSearch(value || '');
      if (!o) setShowNewExercise(false);
    }}>
      <PopoverTrigger asChild>
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch(value || '');
          }}
          placeholder={placeholder}
          className={`flex-1 ${className}`}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 bg-popover border border-border"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <AnimatePresence mode="wait">
          {!showNewExercise ? (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Command>
                <CommandInput
                  placeholder="Buscar exercício..."
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList>
                  {filtered.length === 0 && !isNewExercise && (
                    <CommandEmpty>Nenhum exercício encontrado</CommandEmpty>
                  )}

                  {/* Existing exercises */}
                  {filtered.length > 0 && (
                    <CommandGroup heading="Exercícios">
                      {filtered.map((ex) => {
                        const visual = PATTERN_VISUALS[ex.movementPattern.name];
                        return (
                          <CommandItem
                            key={ex.id}
                            value={ex.name}
                            onSelect={() => handleSelect(ex.name)}
                            className="flex items-center justify-between"
                          >
                            <span className="truncate">{ex.name}</span>
                            <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                              {visual && (
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${visual.color}`}>
                                  {visual.label}
                                </Badge>
                              )}
                              {ex.source === 'custom' && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">
                                  Meu
                                </Badge>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}

                  {/* New exercise CTA */}
                  {isNewExercise && onCreateCustom && (
                    <div className="p-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setShowNewExercise(true)}
                        className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            Novo exercício: <span className="text-primary">{search.trim()}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Categorize para calcular carga
                          </p>
                        </div>
                      </button>
                    </div>
                  )}
                </CommandList>
              </Command>
            </motion.div>
          ) : (
            /* Pattern selection for new exercise */
            <motion.div
              key="patterns"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-3 space-y-3"
            >
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewExercise(false)}
                  className="h-7 px-2 text-xs"
                >
                  ← Voltar
                </Button>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-primary truncate">{search.trim()}</p>
                  <p className="text-[11px] text-muted-foreground">Selecione o padrão de movimento:</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {patterns.map((pattern) => {
                  const visual = PATTERN_VISUALS[pattern.name];
                  if (!visual) return null;

                  return (
                    <button
                      key={pattern.id}
                      type="button"
                      disabled={creatingPattern}
                      onClick={() => handleCreateCustom(pattern.id)}
                      className={`
                        flex items-center gap-2 p-2 rounded-md border transition-all text-left
                        hover:scale-[1.02] active:scale-[0.98]
                        ${visual.color}
                        disabled:opacity-50 disabled:cursor-wait
                      `}
                    >
                      <div className="flex-shrink-0">{visual.icon}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{visual.label}</p>
                        <p className="text-[10px] opacity-70 truncate">{visual.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
