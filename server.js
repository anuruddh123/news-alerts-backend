const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const webPush = require('web-push');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const User = require('./models/userModel');

// ---------------- ENV ----------------
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

console.log("🚀 Server starting...");
console.log("API AUTH LOADING CHECK");

// ---------------- APP ----------------
const app = express();
const server = http.createServer(app);

// ---------------- CLIENT ----------------
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');

console.log("CLIENT_URL:", CLIENT_URL);

// ---------------- CORS (FIXED) ----------------
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (
      origin === CLIENT_URL ||
      origin.includes("netlify.app") ||
      origin === "http://localhost:3000"
    ) {
      return callback(null, true);
    }

    return callback(new Error("CORS blocked: " + origin));
  },
  credentials: true
}));

app.options('*', cors());

// ---------------- SOCKET ----------------
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// ---------------- SOCKET AUTH ----------------
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id');

    if (!user) return next(new Error("Unauthorized"));

    socket.userId = user._id.toString();
    next();
  } catch (err) {
    next(new Error("Socket auth failed"));
  }
});

// ---------------- MIDDLEWARE ----------------
app.use(express.json());
app.use(morgan('dev'));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200
}));

// ---------------- DB ----------------
connectDB();

// ---------------- ROUTES (IMPORTANT DEBUG) ----------------
const authRoutes = require('./routes/authRoutes');
const newsRoutes = require('./routes/newsRoutes');
const userRoutes = require('./routes/userRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');

console.log("✅ AUTH ROUTES LOADED");

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/subscribe', subscriptionRoutes);

// ---------------- HEALTH ----------------
app.get('/', (req, res) => {
  res.json({ message: "News API Running 🚀" });
});

// ---------------- SOCKET ----------------
io.on('connection', (socket) => {
  console.log("Socket connected:", socket.id);

  if (socket.userId) {
    socket.join(socket.userId);
  }

  socket.on('disconnect', () => {
    console.log("Socket disconnected");
  });
});

app.set('io', io);

// ---------------- ERROR HANDLER ----------------
app.use((req, res) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
});

// ---------------- START ----------------
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🔥 Backend running on port ${PORT}`);
});