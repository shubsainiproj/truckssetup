const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname)); // serve index.html

app.post('/save', (req, res) => {
  const { stateCode, stateName, email, mobile, groupEmail } = req.body;
  const filePath = 'data.json';

  let db = {};

  if (fs.existsSync(filePath)) {
    db = JSON.parse(fs.readFileSync(filePath));
  }

  const sectionKey = `===============${stateCode}- ${stateName}=======`;

  if (!db[sectionKey]) db[sectionKey] = {};
  db[sectionKey][email] = {
    mobile: mobile,
    groupEmail: groupEmail
  };

  fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
  res.send('Data saved.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
