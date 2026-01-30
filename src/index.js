import express from 'express';

const app = express();
const PORT = 8000;

// JSON middleware
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Sportz!' });
});

// Start server and log URL
const server = app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
