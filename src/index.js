const express = require('express');
const app = express();

const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Hello from Cloud Run deployed via GitHub Actions!');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
