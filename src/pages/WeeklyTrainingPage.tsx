/**
 * WeeklyTrainingPage - Wrapper para a tela rica de Treino Semanal
 * 
 * Esta página apenas renderiza o componente Dashboard antigo completo,
 * que contém toda a funcionalidade de:
 * - Navegação SEG–DOM
 * - WeekNavigator (período semanal)
 * - Blocos de treino detalhados
 * - CTA para execução
 * 
 * NÃO é uma tela simplificada - é a tela rica original.
 */

import { Dashboard } from '@/components/Dashboard';

export default function WeeklyTrainingPage() {
  return <Dashboard />;
}
