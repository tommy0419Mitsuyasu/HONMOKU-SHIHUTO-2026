const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // for parsing application/json

// API Routes
const authRoutes = require('./src/api/auth');
const shiftRoutes = require('./src/api/shifts');
app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);

app.get('/', (req, res) => {
  res.send('Shift Management API is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
