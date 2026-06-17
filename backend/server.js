const express = require('express');
const cors = require('cors');
const { initEngine, getState } = require('./engine');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/state', (req, res) => {
  res.json(getState());
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`FastAPI-equivalent Node backend running on port ${PORT}`);
  initEngine();
});
