const express = require('express');
const cors = require('cors');
const { initEngine, getState, setDisaster } = require('./engine');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/state', (req, res) => {
  res.json(getState());
});

app.post('/api/disaster', (req, res) => {
  const { scenario } = req.body;
  setDisaster(scenario);
  res.json({ success: true, state: getState() });
});

app.post('/api/disaster/clear', (req, res) => {
  setDisaster(null);
  res.json({ success: true, state: getState() });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`FastAPI-equivalent Node backend running on port ${PORT}`);
  initEngine();
});

