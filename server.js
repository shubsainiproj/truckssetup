const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to your bot file
const BOT_FILE = path.join(__dirname, 'bot.py');

// Python packages to install
const REQUIRED_PY_PACKAGES = [
  'requests',
  'watchdog',
  'logging',   // logging is built-in, technically no need to install
  'mmap'       // also built-in
];

// Function to install required Python packages
function installPythonPackages() {
  const pipInstallCmd = `pip install ${REQUIRED_PY_PACKAGES.join(' ')}`;
  console.log(`📦 Installing Python packages: ${pipInstallCmd}`);
  exec(pipInstallCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Failed to install packages: ${error.message}`);
      return;
    }
    console.log(`✅ Python packages installed:\n${stdout}`);
    startBot();
  });
}

// Function to start bot.py
function startBot() {
  if (!fs.existsSync(BOT_FILE)) {
    console.error(`❌ bot.py not found at ${BOT_FILE}`);
    return;
  }

  console.log('🚀 Launching bot.py...');
  exec(`python ${BOT_FILE}`, (err, stdout, stderr) => {
    if (err) {
      console.error(`❌ Error running bot.py: ${err.message}`);
      return;
    }
    console.log(`🟢 bot.py output:\n${stdout}`);
    if (stderr) console.error(`bot.py stderr:\n${stderr}`);
  });
}

// Static site and body parsing
app.use(express.json());
app.use(express.static(__dirname));

// You can keep your /save route here if needed
// For now, we'll focus only on launching the Python environment

// Start server
app.listen(PORT, () => {
  console.log(`✅ Node server running on http://localhost:${PORT}`);
  installPythonPackages();  // One-time setup on server start
});
