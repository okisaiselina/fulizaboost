# Adsterra Banner Ad Implementation

## Overview

This implementation injects Adsterra banner ads directly into the DOM after the component mounts. The ad appears in the Hero section, immediately after the page title and description.

---

## File 1: AdsterraBanner Component

**File**: `/components/adsterra-banner.tsx`

```tsx
'use client';

import { useEffect, useRef } from 'react';

export function AdsterraBanner() {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adRef.current) return;

    // Clear any existing content
    adRef.current.innerHTML = '';

    // Create config script
    const configScript = document.createElement('script');
    configScript.type = 'text/javascript';
    configScript.text = `
      atOptions = {
        'key' : '32fee0b23b7cae525fffad7ff51a1f64',
        'format' : 'iframe',
        'height' : 50,
        'width' : 320,
        'params' : {}
      };
    `;

    // Create invoke script
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = 'https://elegantimpose.com/32fee0b23b7cae525fffad7ff51a1f64/invoke.js';

    // Append both scripts to the container
    adRef.current.appendChild(configScript);
    adRef.current.appendChild(invokeScript);
  }, []);

  return (
    <div className="flex justify-center my-6">
      <div 
        ref={adRef}
        style={{ width: '320px', height: '50px' }}
      />
    </div>
  );
}
```

**What This Does**:
- Uses `useRef` to get a direct reference to the DOM container
- On component mount, injects the exact Adsterra script code directly into that container
- The config script sets `atOptions` globally
- The invoke script loads and renders the ad in the same container
- Fixed dimensions ensure the ad space is reserved

---

## File 2: Hero Component (Where Ad is Placed)

**File**: `/components/hero.tsx`

```tsx
'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { AdsterraBanner } from '@/components/adsterra-banner';

export function Hero() {
  return (
    <div className="relative bg-gradient-to-b from-green-50 to-white dark:from-slate-900 dark:to-slate-800 py-12 px-4 transition-colors duration-200">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="max-w-4xl mx-auto text-center pt-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 text-balance">
          Boost your <span className="text-green-600 dark:text-green-400">Fuliza Limit</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-balance mb-6">
          Choose your target limit and complete a secure payment to upgrade instantly.
        </p>

        {/* Adsterra Banner Ad */}
        <AdsterraBanner />
      </div>
    </div>
  );
}
```

**Changes Made**:
- Added import: `import { AdsterraBanner } from '@/components/adsterra-banner';`
- Added component: `<AdsterraBanner />` after the description paragraph

---

## Ad Position in Page Layout

```
┌─────────────────────────────────────────┐
│                                         │
│    HERO SECTION                         │
│  [Theme Toggle - top right]             │
│                                         │
│  "Boost your Fuliza Limit"              │
│                                         │
│  "Choose your target limit..."          │
│                                         │
│  ╔═════════════════════════════╗        │
│  ║  ADSTERRA BANNER (320x50)   ║  <-- HERE
│  ╚═════════════════════════════╝        │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│    FEATURES SECTION                     │
│                                         │
```

---

## Ad Configuration

| Property | Value |
|----------|-------|
| **Key** | `32fee0b23b7cae525fffad7ff51a1f64` |
| **Format** | iframe |
| **Width** | 320px |
| **Height** | 50px |
| **Script URL** | `https://elegantimpose.com/32fee0b23b7cae525fffad7ff51a1f64/invoke.js` |

---

## How to Reuse This Ad

### Option 1: Use the Component Directly

Import and use `<AdsterraBanner />` anywhere in your app:

```tsx
import { AdsterraBanner } from '@/components/adsterra-banner';

// In your component JSX:
<AdsterraBanner />
```

### Option 2: Copy the Raw Script

If you need to place the ad in plain HTML or another framework:

```html
<script>
  atOptions = {
    'key' : '32fee0b23b7cae525fffad7ff51a1f64',
    'format' : 'iframe',
    'height' : 50,
    'width' : 320,
    'params' : {}
  };
</script>
<script src="https://elegantimpose.com/32fee0b23b7cae525fffad7ff51a1f64/invoke.js"></script>
```

### Option 3: Different Ad Key

To use a different Adsterra ad, update these values in `adsterra-banner.tsx`:

1. Replace `'key' : 'YOUR_NEW_KEY'`
2. Replace script src: `https://elegantimpose.com/YOUR_NEW_KEY/invoke.js`
3. Update `height` and `width` if needed

---

## Files Summary

| File | Purpose |
|------|---------|
| `/components/adsterra-banner.tsx` | Ad component - injects scripts on mount |
| `/components/hero.tsx` | Uses AdsterraBanner after description |

---

## Why This Works

1. **Direct DOM Manipulation**: Scripts are injected directly into the DOM using `createElement` and `appendChild`
2. **useRef Container**: The ad scripts are appended to a specific container element
3. **Fixed Dimensions**: Container has explicit width/height so the ad has space
4. **Client-Side Only**: `'use client'` ensures scripts run in the browser, not during SSR
5. **Immediate Execution**: Scripts execute as soon as the component mounts
