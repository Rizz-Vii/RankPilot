#!/usr/bin/env node

// RankPilot Favicon Generator
// This script generates favicon files in multiple sizes

const fs = require("fs");
const path = require("path");

const COLORS = {
  PRIMARY: "rgb(102,153,204)",
  WHITE: "rgb(255,255,255)",
  FLAME: "rgb(255,107,107)",
};

// Create a simple canvas-like drawing system using ASCII art as a placeholder
// In a real implementation, you'd use a proper image library like sharp or canvas

const faviconSizes = [16, 32, 48, 180, 192, 512];

// SVG template for RankPilot favicon
const createFaviconSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="16" cy="16" r="16" fill="${COLORS.PRIMARY}"/>
  
  <!-- Rocket body -->
  <ellipse cx="16" cy="16" rx="4.8" ry="11.2" fill="${COLORS.WHITE}"/>
  
  <!-- Rocket nose -->
  <path d="M16 4.8 L12.8 11.2 L19.2 11.2 Z" fill="${COLORS.WHITE}"/>
  
  <!-- Left fin -->
  <path d="M11.2 22.4 L8 27.2 L12.8 25.6 Z" fill="${COLORS.WHITE}"/>
  
  <!-- Right fin -->
  <path d="M20.8 22.4 L24 27.2 L19.2 25.6 Z" fill="${COLORS.WHITE}"/>
  
  <!-- Rocket flame -->
  <ellipse cx="16" cy="28.8" rx="2.56" ry="3.84" fill="${COLORS.FLAME}"/>
  
  <!-- Window/detail -->
  <circle cx="16" cy="12" r="1.6" fill="${COLORS.PRIMARY}"/>
</svg>`;

// Create favicon files
const generateFavicons = () => {
  const publicDir = path.join(__dirname, "public");

  console.log("🚀 Generating RankPilot favicons...");

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Generate SVG files for different sizes
  faviconSizes.forEach((size) => {
    let filename;

    switch (size) {
      case 16:
        filename = "favicon-16x16.svg";
        break;
      case 32:
        filename = "favicon-32x32.svg";
        break;
      case 180:
        filename = "apple-touch-icon.svg";
        break;
      case 192:
        filename = "android-chrome-192x192.svg";
        break;
      case 512:
        filename = "android-chrome-512x512.svg";
        break;
      default:
        filename = `favicon-${size}x${size}.svg`;
    }

    const svgContent = createFaviconSVG(size);
    const filePath = path.join(publicDir, filename);

    fs.writeFileSync(filePath, svgContent);
    console.log(`✅ Generated ${filename}`);
  });

  // Create the main favicon.svg (already created above)
  console.log("✅ Main favicon.svg already created");

  // Create browserconfig.xml for Windows tiles
  const browserConfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square150x150logo src="/mstile-150x150.png"/>
            <TileColor>${COLORS.PRIMARY}</TileColor>
        </tile>
    </msapplication>
</browserconfig>`;

  fs.writeFileSync(path.join(publicDir, "browserconfig.xml"), browserConfig);
  console.log("✅ Generated browserconfig.xml");

  console.log("🎉 All favicon files generated successfully!");
  console.log("\nNext steps:");
  console.log("1. Update your layout.tsx with the new favicon links");
  console.log(
    "2. Convert SVG files to PNG using online tools or image libraries"
  );
  console.log("3. Test the favicons in different browsers");
};

// Run the generator
generateFavicons();

module.exports = { createFaviconSVG, generateFavicons };
