# PWA Icon Generation Guide

## Quick Start: Generate Icons from Logo

### Option 1: Using Online Tool (Easiest)
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload your company logo (square format recommended, 1024x1024px minimum)
3. Download the generated icon pack
4. Extract all icons to `/public/icons/` directory

### Option 2: Using ImageMagick (Command Line)
```powershell
# Install ImageMagick: winget install ImageMagick.ImageMagick

# Navigate to project directory
cd c:\Users\Jonathan\Ketterly2.0\ketterly2.0

# Convert your logo to all required sizes
magick convert logo.png -resize 72x72 public/icons/icon-72x72.png
magick convert logo.png -resize 96x96 public/icons/icon-96x96.png
magick convert logo.png -resize 128x128 public/icons/icon-128x128.png
magick convert logo.png -resize 144x144 public/icons/icon-144x144.png
magick convert logo.png -resize 152x152 public/icons/icon-152x152.png
magick convert logo.png -resize 192x192 public/icons/icon-192x192.png
magick convert logo.png -resize 384x384 public/icons/icon-384x384.png
magick convert logo.png -resize 512x512 public/icons/icon-512x512.png

# Create maskable icons (with safe zone padding)
magick convert logo.png -resize 192x192 -gravity center -extent 192x192 -background white public/icons/icon-192x192-maskable.png
magick convert logo.png -resize 512x512 -gravity center -extent 512x512 -background white public/icons/icon-512x512-maskable.png
```

### Option 3: Using Canva (Design Tool)
1. Go to https://www.canva.com
2. Create designs for each size:
   - 72x72, 96x96, 128x128, 144x144, 152x152
   - 192x192, 384x384, 512x512
3. Export as PNG with transparent background
4. Save to `/public/icons/`

## Required Icon Sizes

| Size | Purpose | Notes |
|------|---------|-------|
| 72x72 | Android Chrome | Small screens |
| 96x96 | Windows tiles | Desktop shortcuts |
| 128x128 | Chrome Web Store | PWA listing |
| 144x144 | Windows tiles | Medium tiles |
| 152x152 | iOS Safari | Add to Home Screen |
| 192x192 | Android standard | Most common |
| 384x384 | Android high-res | Large displays |
| 512x512 | Splash screens | iOS/Android |
| 192x192 (maskable) | Adaptive icons | Android 13+ |
| 512x512 (maskable) | Adaptive icons | Android 13+ |

## Maskable Icons
Maskable icons have safe zones to ensure the icon looks good when cropped into different shapes (circle, square, rounded square).

**Safe Zone Guidelines:**
- Keep important content within 80% of canvas size
- Use 10% padding on all sides
- Background should extend to edges

## Apple Touch Icons
For iOS devices, also create:
- `apple-touch-icon.png` (180x180)
- Place in `/public/` root

```powershell
magick convert logo.png -resize 180x180 public/apple-touch-icon.png
```

## Favicon
Create a favicon for browser tabs:
```powershell
magick convert logo.png -resize 32x32 public/favicon.ico
```

## Current Status
⚠️ **Placeholder icons need to be replaced with actual company branding**

Icons should feature:
- Company logo
- Brand colors (#1e40af blue theme)
- Clean, recognizable design
- Proper safe zones for maskable versions
