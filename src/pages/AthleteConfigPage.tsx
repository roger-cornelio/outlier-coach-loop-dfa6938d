/**
 * AthleteConfigPage - Wrapper para a tela rica de Configurações do Atleta
 * 
 * Esta página renderiza o componente AthleteConfig completo (wizard),
 * que contém toda a funcionalidade de:
 * - Configuração de nome
 * - Seleção de nível (OPEN/PRO)
 * - Configuração de duração de sessão
 * - Dados biométricos (altura, peso, idade, sexo)
 * - Persistência no banco de dados
 * 
 * NÃO é uma tela simplificada - é a tela rica original.
 */

import { AthleteConfig } from '@/components/AthleteConfig';

export default function AthleteConfigPage() {
  return <AthleteConfig />;
}
