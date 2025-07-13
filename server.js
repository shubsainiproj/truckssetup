const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join(__dirname, 'data.json');

app.use(bodyParser.json());
app.use(express.static(__dirname));

// Utility: Sanitize input
function sanitize(input) {
  return String(input).trim().replace(/[<>]/g, '');
}

app.post('/save', (req, res) => {
  try {
    const { stateCode, stateName, email, mobile, groupEmail } = req.body;

    if (!stateCode || !stateName || !email || !mobile || !groupEmail) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const entry = {
      mobile: sanitize(mobile),
      groupEmail: sanitize(groupEmail)
    };

    let db = {};

    if (fs.existsSync(FILE_PATH)) {
      const fileContent = fs.readFileSync(FILE_PATH, 'utf8');
      db = fileContent ? JSON.parse(fileContent) : {};
    }

    const sectionKey = `=============== ${stateCode} - ${stateName} ===============`;

    if (!db[sectionKey]) db[sectionKey] = {};

    if (db[sectionKey][email]) {
      return res.json({ success: false, message: 'Email already exists in this state section.' });
    }

    db[sectionKey][sanitize(email)] = entry;

    fs.writeFileSync(FILE_PATH, JSON.stringify(db, null, 2));
    return res.json({ success: true, message: `Successfully saved under ${stateCode} - ${stateName}` });
  } catch (err) {
    console.error('Error saving data:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
