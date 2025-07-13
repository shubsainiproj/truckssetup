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
const GITHUB_REMOTE = 'https://<GITHUB_TOKEN>@github.com/shubsainiproj/datastore.git'; // replace below

const pushToGitHub = () => {
  exec(`
    cd ${DATASTORE_REPO} &&
    git pull &&
    cp ${LOCAL_JSON} . &&
    git add data.json &&
    git commit -m "Auto update: $(date)" &&
    git push
  `, (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Git push failed:", stderr);
    } else {
      console.log("✅ Auto Git push complete.");
    }
  });
};

app.post('/save', (req, res) => {
  const { stateCode, stateName, email, mobile, groupEmail } = req.body;

  let db = {};

  if (fs.existsSync(LOCAL_JSON)) {
    db = JSON.parse(fs.readFileSync(LOCAL_JSON));
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
  pushToGitHub(); // Auto push after write

  res.send('✅ Data saved and pushed to GitHub!');
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
