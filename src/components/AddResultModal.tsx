import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trophy, Medal, Timer, Upload, X, Camera, 
  CheckCircle, Loader2, Calendar, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type ResultType = 'benchmark' | 'simulado' | 'prova_oficial';

interface AddResultModalProps {
  onResultAdded?: () => void;
}

const RESULT_TYPES = [
  { value: 'simulado', label: 'Simulado', icon: Timer, description: 'Treino simulando prova oficial' },
  { value: 'prova_oficial', label: 'Prova Oficial', icon: Medal, description: 'Competição HYROX oficial' },
] as const;

export function AddResultModal({ onResultAdded }: AddResultModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [resultType, setResultType] = useState<ResultType>('simulado');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const calculateTotalSeconds = (): number | null => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;
    if (h === 0 && m === 0 && s === 0) return null;
    return h * 3600 + m * 60 + s;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para adicionar resultados');
      return;
    }

    const totalSeconds = calculateTotalSeconds();
    if (!totalSeconds && !screenshotFile) {
      toast.error('Insira o tempo ou faça upload do print do resultado');
      return;
    }

    if (!eventName.trim()) {
      toast.error('Digite o nome do evento');
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotUrl: string | null = null;

      // Upload screenshot if provided
      if (screenshotFile) {
        const fileExt = screenshotFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('result-screenshots')
          .upload(fileName, screenshotFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('result-screenshots')
          .getPublicUrl(fileName);
        
        screenshotUrl = publicUrl;
      }

      // Insert the result
      const { error: insertError } = await supabase
        .from('benchmark_results')
        .insert({
          user_id: user.id,
          result_type: resultType,
          event_name: eventName.trim(),
          event_date: eventDate || null,
          time_in_seconds: totalSeconds,
          screenshot_url: screenshotUrl,
          completed: true,
          block_id: `${resultType}_${Date.now()}`,
          workout_id: `${resultType}_${Date.now()}`,
          benchmark_id: resultType === 'prova_oficial' ? 'HYROX_OFFICIAL' : 'HYROX_SIMULADO',
        });

      if (insertError) throw insertError;

      toast.success(
        resultType === 'prova_oficial' 
          ? 'Prova oficial registrada! 🏆' 
          : 'Simulado registrado! 💪'
      );

      // Reset form
      setEventName('');
      setEventDate('');
      setHours('');
      setMinutes('');
      setSeconds('');
      removeScreenshot();
      setOpen(false);
      onResultAdded?.();
    } catch (error) {
      console.error('Error adding result:', error);
      toast.error('Erro ao salvar resultado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeDisplay = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;
    if (h === 0 && m === 0 && s === 0) return '--:--:--';
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Adicionar Resultado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Registrar Resultado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Result Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            {RESULT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = resultType === type.value;
              return (
                <motion.button
                  key={type.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setResultType(type.value as ResultType)}
                  className={`
                    p-4 rounded-xl border-2 text-left transition-all
                    ${isSelected 
                      ? type.value === 'prova_oficial'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-primary bg-primary/10'
                      : 'border-border hover:border-muted-foreground/50'
                    }
                  `}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isSelected ? type.value === 'prova_oficial' ? 'text-amber-500' : 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-semibold text-sm">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </motion.button>
              );
            })}
          </div>

          {/* Event Name */}
          <div className="space-y-2">
            <Label htmlFor="eventName" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Nome do Evento
            </Label>
            <Input
              id="eventName"
              placeholder={resultType === 'prova_oficial' ? 'Ex: HYROX São Paulo 2024' : 'Ex: Simulado Box CrossFit'}
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </div>

          {/* Event Date */}
          <div className="space-y-2">
            <Label htmlFor="eventDate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data do Evento
            </Label>
            <Input
              id="eventDate"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          {/* Time Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Tempo Final
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="HH"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="text-center"
                />
                <p className="text-xs text-center text-muted-foreground mt-1">Horas</p>
              </div>
              <span className="text-2xl text-muted-foreground">:</span>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="MM"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="text-center"
                />
                <p className="text-xs text-center text-muted-foreground mt-1">Min</p>
              </div>
              <span className="text-2xl text-muted-foreground">:</span>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="SS"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  className="text-center"
                />
                <p className="text-xs text-center text-muted-foreground mt-1">Seg</p>
              </div>
            </div>
            <p className="text-center font-mono text-lg text-primary">
              {formatTimeDisplay()}
            </p>
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Print do Resultado (opcional)
            </Label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <AnimatePresence mode="wait">
              {screenshotPreview ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative rounded-xl overflow-hidden border border-border"
                >
                  <img 
                    src={screenshotPreview} 
                    alt="Preview" 
                    className="w-full h-40 object-cover"
                  />
                  <button
                    onClick={removeScreenshot}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Clique para upload</p>
                  <p className="text-xs text-muted-foreground/60">PNG, JPG até 5MB</p>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (!calculateTotalSeconds() && !screenshotFile)}
            className="w-full gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Registrar {resultType === 'prova_oficial' ? 'Prova' : 'Simulado'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
