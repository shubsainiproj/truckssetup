const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to your bot file
const BOT_FILE = path.join(__dirname, 'bot.py');
const VENV_DIR = path.join(__dirname, 'venv');

// Python packages that are NOT built-in
const REQUIRED_PY_PACKAGES = ['requests', 'watchdog'];

// Middleware to parse incoming JSON
app.use(express.json());

// Serve static files from current directory
app.use(express.static(__dirname));

// 🔐 Route to save incoming JSON to data.json
app.post('/save', (req, res) => {
  const data = req.body;
  const filePath = path.join(__dirname, 'data.json');

  fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('❌ Failed to write data.json:', err);
      return res.status(500).json({ success: false, error: 'Failed to save file' });
    }
    console.log('✅ data.json saved successfully.');
    res.json({ success: true });
  });
});

// Function to create a virtual environment and install packages
function setupVirtualEnv() {
  if (!fs.existsSync(VENV_DIR)) {
    console.log('🔧 Creating Python virtual environment...');
    exec(`python3 -m venv venv`, (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ Failed to create venv: ${err.message}`);
        return;
      }
      console.log('✅ Virtual environment created.');
      installPythonPackages();
    });
  } else {
    console.log('🔁 Virtual environment already exists.');
    installPythonPackages();
  }
}

// Function to install required Python packages inside the venv
function installPythonPackages() {
  const pipCmd = `venv/bin/pip install ${REQUIRED_PY_PACKAGES.join(' ')}`;
  console.log(`📦 Installing Python packages: ${pipCmd}`);
  exec(pipCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Failed to install packages: ${error.message}`);
      return;
    }
    console.log(`✅ Python packages installed:\n${stdout}`);
    startBot();
  });
}

// Function to start bot.py using the virtual environment
function startBot() {
  if (!fs.existsSync(BOT_FILE)) {
    console.error(`❌ bot.py not found at ${BOT_FILE}`);
    return;
  }

  console.log('🚀 Launching bot.py...');
  exec(`venv/bin/python ${BOT_FILE}`, (err, stdout, stderr) => {
    if (err) {
      console.error(`❌ Error running bot.py: ${err.message}`);
      return;
    }
    console.log(`🟢 bot.py output:\n${stdout}`);
    if (stderr) console.error(`bot.py stderr:\n${stderr}`);
  });
}

// Start Node server
app.listen(PORT, () => {
  console.log(`✅ Node server running on http://localhost:${PORT}`);
  setupVirtualEnv();  // Auto-setup Python venv on launch
});
