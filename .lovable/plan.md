

## Plan: Dynamic CTA copy + bigger shield

**Single file**: `src/components/LevelUpModal.tsx`

### Context correction
The modal celebrates the level the athlete **just completed** (e.g., completed OPEN requirements → shows OPEN shield). The CTA should point to the **next** level.

### Changes

1. **Add `nextLabel` to STATUS_CONFIG**:
   - `open` → `nextLabel: 'PRO OUTLIER'`
   - `pro` → `nextLabel: 'ELITE OUTLIER'`
   - `elite` → `nextLabel: null` (max level)

2. **Dynamic button text**:
   - `open`: "Avançar para PRO OUTLIER"
   - `pro`: "Avançar para ELITE OUTLIER"
   - `elite`: "Você é ELITE OUTLIER" (no next level)
   - Add `ChevronRight` icon from lucide-react (except elite)

3. **Increase shield size**:
   - Mobile: `w-40 h-40` → `w-56 h-56`
   - Desktop: `w-52 h-52` → `w-72 h-72`
   - Expand glow layers: `-m-16` → `-m-20`, `blur-[80px]` → `blur-[100px]`; `-m-8` → `-m-12`

