# Color Reference Guide

## HSL to HEX Conversion Reference
Our theme uses HSL (Hue, Saturation, Lightness) values in the format: `H S% L%`

### Current Theme Colors
```css
/* Dark Theme */
--background: 250 86% 14%;    /* #250A3D - Deep Purple */
--foreground: 210 40% 98%;    /* #F8FAFC - Almost White */
--primary: 252 87% 67%;       /* #795EFF - Bright Purple */
--secondary: 250 86% 20%;     /* #341152 - Dark Purple */
--muted: 250 86% 20%;         /* #341152 - Dark Purple */
--accent: 250 86% 20%;        /* #341152 - Dark Purple */

/* Light Theme */
--background: 0 0% 100%;      /* #FFFFFF - Pure White */
--foreground: 222.2 84% 4.9%; /* #0C0D0E - Almost Black */
--primary: 252 87% 67%;       /* #795EFF - Bright Purple */
--secondary: 210 40% 96.1%;   /* #F1F5F9 - Light Gray */
```

### Understanding HSL Values
```
H (Hue): 0-360 degrees on the color wheel
  - 0/360: Red
  - 120: Green
  - 240: Blue
  - 250-260: Purple (our theme's primary range)

S (Saturation): 0-100%
  - 0%: Grayscale
  - 100%: Full color

L (Lightness): 0-100%
  - 0%: Black
  - 50%: Normal
  - 100%: White
```

### Common Adjustments
1. To darken a color: Decrease the L value
   - Example: 250 86% 14% → 250 86% 12%

2. To lighten a color: Increase the L value
   - Example: 250 86% 14% → 250 86% 16%

3. To make a color more vibrant: Increase the S value
   - Example: 250 86% 14% → 250 90% 14%

4. To mute a color: Decrease the S value
   - Example: 250 86% 14% → 250 80% 14%

### Tips for UI Development
- For text on dark backgrounds, keep L values above 90%
- For subtle borders, use the main color but reduce opacity
- For hover states, adjust L by ±5-10%
- For disabled states, reduce S to around 30-40%

### Popular Color Values
```css
/* Purples (Our Theme) */
Deep Purple: 250 86% 14%  /* #250A3D */
Rich Purple: 252 87% 67%  /* #795EFF */
Light Purple: 250 86% 75% /* #C2B5FF */

/* Grays */
Slate 900: 222 47% 11%   /* #0F172A */
Slate 800: 217 33% 17%   /* #1E293B */
Slate 700: 215 25% 27%   /* #334155 */
Slate 100: 210 40% 96%   /* #F1F5F9 */

/* System Colors */
Success: 142 72% 29%     /* #15803D */
Warning: 45 93% 47%      /* #EAB308 */
Error: 0 84% 60%        /* #EF4444 */
```
