import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './config/database.js';
import { LabelTemplate } from './models/LabelTemplate.js';
import labelRoutes from './routes/labelRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup CORS
function setupCORS() {
  const corsOptions = {
    origin: function(origin, callback) {
      const allowedOrigins = [
        'https://www.vend88.com.au',
        'https://dev.vend88.com',
        'http://localhost:3001',
        'http://localhost:3003'
      ];

      if (NODE_ENV === 'development') {
        return callback(null, true);
      }

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
  };

  app.use(cors(corsOptions));
}

// Setup request logging
function setupRequestLogging() {
  const logDir = process.env.LOG_DIR || path.join(__dirname, '../logs');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${req.method} ${req.url}\n`;
    fs.appendFileSync(path.join(logDir, 'requests.log'), logEntry);
    next();
  });
}

// Middleware
setupCORS();
setupRequestLogging();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/label', labelRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Initialize and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');

    await LabelTemplate.initializeTable();
    console.log('Tables initialized successfully');

    app.listen(PORT, () => {
      console.log(`Label Printer Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
