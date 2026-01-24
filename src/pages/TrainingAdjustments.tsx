/**
 * TrainingAdjustments - Tela de Ajustes de Treino
 * 
 * Responsabilidades:
 * - Equipamentos disponíveis/indisponíveis
 * - Adaptações de box
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Check, X } from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { EQUIPMENT_LIST } from '@/types/outlier';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function TrainingAdjustments() {
  const { user } = useAuth();
  const { athleteConfig, setAthleteConfig } = useOutlierStore();
  const [unavailableEquipment, setUnavailableEquipment] = useState<string[]>(
    athleteConfig?.unavailableEquipment || []
  );
  const [equipmentNotes, setEquipmentNotes] = useState(
    athleteConfig?.equipmentNotes || ''
  );
  const [saving, setSaving] = useState(false);

  const toggleEquipment = (equipmentId: string) => {
    setUnavailableEquipment(prev => 
      prev.includes(equipmentId)
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  const handleSave = async () => {
    if (!athleteConfig || !user) return;

    setSaving(true);
    try {
      // Update local store
      setAthleteConfig({
        ...athleteConfig,
        unavailableEquipment,
        equipmentNotes,
      });

      // Persist to database
      const { error } = await supabase
        .from('profiles')
        .update({
          unavailable_equipment: unavailableEquipment,
          equipment_notes: equipmentNotes,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Ajustes salvos com sucesso!');
    } catch (error) {
      console.error('Error saving adjustments:', error);
      toast.error('Erro ao salvar ajustes');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = 
    JSON.stringify(unavailableEquipment) !== JSON.stringify(athleteConfig?.unavailableEquipment || []) ||
    equipmentNotes !== (athleteConfig?.equipmentNotes || '');

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Wrench className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-display tracking-wide">Ajustes de Treino</h1>
      </div>

      {/* Equipment Section */}
      <section className="mb-8">
        <h2 className="text-lg font-display mb-4">Equipamentos Disponíveis</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Marque os equipamentos que você <strong>NÃO</strong> tem disponíveis. 
          O sistema adaptará os treinos automaticamente.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {EQUIPMENT_LIST.map((equipment) => {
            const isUnavailable = unavailableEquipment.includes(equipment.id);
            return (
              <motion.button
                key={equipment.id}
                onClick={() => toggleEquipment(equipment.id)}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${isUnavailable 
                    ? 'border-destructive/50 bg-destructive/10 text-destructive' 
                    : 'border-border bg-card hover:border-primary/50'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{equipment.name}</span>
                  {isUnavailable ? (
                    <X className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 flex-shrink-0 text-green-500" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Notes Section */}
      <section className="mb-8">
        <h2 className="text-lg font-display mb-4">Observações</h2>
        <textarea
          value={equipmentNotes}
          onChange={(e) => setEquipmentNotes(e.target.value)}
          placeholder="Ex: Tenho apenas kettlebells de 16kg e 24kg..."
          className="w-full p-4 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground resize-none h-24"
        />
      </section>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={!hasChanges || saving}
        className="w-full"
        size="lg"
      >
        {saving ? 'Salvando...' : 'Salvar Ajustes'}
      </Button>

      {unavailableEquipment.length > 0 && (
        <p className="text-center text-muted-foreground text-sm mt-4">
          {unavailableEquipment.length} equipamento(s) marcado(s) como indisponível
        </p>
      )}
    </div>
  );
}
