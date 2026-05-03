const fs = require('fs');
const path = require('path');

async function createIcon() {
    const defaultExport = await import('png-to-ico');
    const pngToIco = defaultExport.default || defaultExport;
    // Ensure the assets folder exists
    const assetsDir = path.join(__dirname, 'assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir);
    }

    try {
        // Make sure you place your generated image as 'my-icon.png' in the root folder!
        const buf = await pngToIco('my-icon.png');

        // This saves the .ico and .png versions into the assets folder
        fs.writeFileSync(path.join(assetsDir, 'icon.ico'), buf);
        fs.copyFileSync('my-icon.png', path.join(assetsDir, 'icon.png'));

        console.log('✅ Icon successfully generated and placed in assets/icon.ico and assets/icon.png!');
    } catch (err) {
        console.error('❌ Error creating icon:', err.message);
    }
}

createIcon();
