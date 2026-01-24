/**
 * WorkoutExecutionPage - Wrapper para a tela rica de Execução de Treino
 * 
 * Esta página renderiza o componente WorkoutExecution completo,
 * que contém toda a funcionalidade de:
 * - Execução passo-a-passo dos blocos
 * - Marcação de exercícios completos
 * - Adaptações de equipamento em tempo real
 * - Feedback de conclusão
 * 
 * NÃO é uma tela simplificada - é a tela rica original.
 */

import { WorkoutExecution } from '@/components/WorkoutExecution';

export default function WorkoutExecutionPage() {
  return <WorkoutExecution />;
}
