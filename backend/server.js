require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initEngine, getState } = require('./engine');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/state', (req, res) => {
  res.json(getState());
});


// Proxy for RailwayGPT to keep API keys completely hidden from end-users
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfiguration: Missing GROQ_API_KEY in .env file.' });
  }

  try {
    const axios = require('axios');
    const { messages } = req.body;
    
    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.3-70b-versatile", // The latest Llama 3.3 model on Groq
      max_tokens: 1000,
      messages: messages
    }, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      }
    });

    res.json({ content: response.data.choices[0].message.content });
  } catch (error) {
    console.error('Groq API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to communicate with the Groq AI service.' });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`FastAPI-equivalent Node backend running on port ${PORT}`);
  initEngine();
});

