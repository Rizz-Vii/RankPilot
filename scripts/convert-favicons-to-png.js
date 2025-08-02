const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Convert SVG favicons to PNG format for broader browser compatibility
async function convertFaviconsToPNG() {
    const publicDir = path.join(__dirname, '..', 'public');

    const conversions = [
        { input: 'favicon.svg', output: 'favicon-16x16.png', size: 16 },
        { input: 'favicon.svg', output: 'favicon-32x32.png', size: 32 },
        { input: 'favicon.svg', output: 'apple-touch-icon.png', size: 180 },
        { input: 'favicon.svg', output: 'android-chrome-192x192.png', size: 192 },
        { input: 'favicon.svg', output: 'android-chrome-512x512.png', size: 512 },
    ]; console.log('🚀 Converting SVG favicons to PNG format...\n');

    for (const conversion of conversions) {
        const inputPath = path.join(publicDir, conversion.input);
        const outputPath = path.join(publicDir, conversion.output);

        try {
            await sharp(inputPath)
                .resize(conversion.size, conversion.size)
                .png()
                .toFile(outputPath);

            console.log(`✅ Created: ${conversion.output} (${conversion.size}x${conversion.size})`);
        } catch (_error) {
            console.error(`❌ Failed to create ${conversion.output}:`, error.message);
        }
    }

    // Create safari-pinned-tab.svg (monochrome version)
    const safariIconPath = path.join(publicDir, 'safari-pinned-tab.svg');
    const safariSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="50" fill="black"/>
    <path d="M35 25 L50 15 L65 25 L60 35 L55 40 L60 50 L55 55 L50 60 L45 55 L40 50 L45 40 L40 35 Z M50 25 L50 35 L55 35 L50 45 L45 35 L50 25 Z" fill="white"/>
  </svg>`;

    fs.writeFileSync(safariIconPath, safariSvg);
    console.log('✅ Created: safari-pinned-tab.svg (monochrome)');

    console.log('\n🎯 Favicon conversion complete! All formats ready for production.');
}

// Install sharp if not available
try {
    require('sharp');
    convertFaviconsToPNG();
} catch (_error) {
    console.log('Installing sharp package for image conversion...');
    const { exec } = require('child_process');
    exec('npm install sharp --save-dev', (err, stdout, stderr) => {
        if (err) {
            console.error('Failed to install sharp:', err);
            return;
        }
        console.log('Sharp installed successfully. Running conversion...');
        convertFaviconsToPNG();
    });
}
