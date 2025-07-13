const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname)); // serve index.html

const LOCAL_JSON = path.join(__dirname, 'data.json');
const DATASTORE_REPO = path.join(__dirname, 'datastore');

// ✅ Replace <GITHUB_TOKEN> with your actual token OR use SSH if server supports it
const GITHUB_REMOTE = 'https://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@github.com/shubsainiproj/datastore.git';

// 🧠 Auto clone if repo not found (optional but helpful)
if (!fs.existsSync(DATASTORE_REPO)) {
  exec(`git clone ${GITHUB_REMOTE} ${DATASTORE_REPO}`, (err) => {
    if (err) {
      console.error("❌ Failed to clone datastore repo. Check token/URL.");
    } else {
      console.log("📥 Cloned datastore repo successfully.");
    }
  });
}

const pushToGitHub = () => {
  const now = new Date().toISOString();
  exec(`
    cd ${DATASTORE_REPO} &&
    git pull &&
    cp ${LOCAL_JSON} . &&
    git add data.json &&
    git commit -m "Auto update at ${now}" &&
    git push
  `, (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Git push failed:\n", stderr);
    } else {
      console.log("✅ Git push success:\n", stdout);
    }
  });
};

app.post('/save', (req, res) => {
  const { stateCode, stateName, email, mobile, groupEmail } = req.body;

  let db = {};

  if (fs.existsSync(LOCAL_JSON)) {
    try {
      db = JSON.parse(fs.readFileSync(LOCAL_JSON));
    } catch (e) {
      console.error("⚠️ Error parsing JSON. Creating new db.");
      db = {};
    }
  }

  const sectionKey = `===============${stateCode}- ${stateName}=======`;

  if (!db[sectionKey]) db[sectionKey] = {};
  if (!db[sectionKey][email]) {
    db[sectionKey][email] = {
      mobile: [mobile],
      groupEmail
    };
  } else {
    if (!db[sectionKey][email].mobile.includes(mobile)) {
      db[sectionKey][email].mobile.push(mobile);
    }
    db[sectionKey][email].groupEmail = groupEmail;
  }

  fs.writeFileSync(LOCAL_JSON, JSON.stringify(db, null, 2));

  // ✅ Trigger auto-push every time
  pushToGitHub();

  res.send('✅ Data saved and pushed to GitHub!');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
