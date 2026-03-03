

## Visual Refinement: Shields to Match Reference Image Exactly

### Current vs Reference — Key Differences

1. **Shield shape/depth**: Current shields are flat. Reference has a visible 3D beveled edge — the outer border appears raised with a subtle gradient, giving depth.

2. **Locked state — icons too faint**: Current `opacity: 0.12` makes icons nearly invisible. Reference shows icons clearly at ~25-30% opacity (#3A3A3A on #1A1A1A background), distinctly visible behind the padlock.

3. **Locked state — border**: Current uses flat `#2F2F2F`. Reference shows a slightly beveled/gradient border that gives the shield dimension even when locked.

4. **Padlock proportions**: Current padlock is roughly correct but needs refinement — reference shows a slightly wider body relative to shackle, and more defined keyhole.

5. **OPEN arrow icon**: Reference shows a sharper, more angular arrowhead — wider at base, with a visible center shaft. Current is close but the proportions need tweaking.

6. **PRO swords**: Reference swords are more stylized — leaf-shaped blades crossing at center with distinct guards. The current pommel circles are too large.

7. **ELITE crown**: Reference crown is wider with rounder peaks and more prominent jewel dots. Current is close but needs wider proportions.

8. **ELITE glow**: Reference has a warm orange outer glow that's more prominent — visible ring of light around the entire shield.

9. **Shield inner bevel**: Reference shows a clear inner shield contour line creating a raised-edge effect. Current `SHIELD_INNER` path exists but opacity may be too low.

### Implementation Plan

**Single file edit**: `src/components/LevelProgress.tsx` — `ShieldCrest` function only.

1. **Increase locked icon opacity** from `0.12` → `0.25` so icons are visible behind padlock (matching reference).

2. **Add 3D bevel effect** to shield border:
   - Add a `linearGradient` for the outer stroke to simulate light from top-left
   - Make inner bevel line more visible (`#3A3A3A` → `#404040` for locked, `borderColor + 44` for active)

3. **Refine OPEN arrow** proportions — wider arrowhead, slightly thinner shaft to match reference.

4. **Refine PRO swords** — reduce pommel size, make blades slightly thinner/more elegant.

5. **Refine ELITE crown** — widen overall, make peaks rounder, increase jewel sizes.

6. **Enhance ELITE glow** — increase `stdDeviation` and opacity for a more visible warm glow ring.

7. **Adjust padlock** — widen body slightly, refine keyhole proportions.

8. **Add subtle gradient to shield background** — reference shows the shield isn't perfectly flat black, it has a very subtle top-to-bottom gradient giving it dimension.

No logic changes. No unlock criteria changes. Purely SVG visual adjustments within the existing `ShieldCrest` component.

