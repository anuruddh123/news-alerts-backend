const path = require('path');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const webPush = require('web-push');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const User = require('./models/userModel');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
console.log('Loaded .env from', path.resolve(__dirname, '..', '.env'));
console.log('NEWS_API_KEY loaded:', !!process.env.NEWS_API_KEY, 'GNEWS_API_KEY loaded:', !!process.env.GNEWS_API_KEY);
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('EMAIL_USER or EMAIL_PASS missing. Email notifications will not be sent until SMTP credentials are configured.');
}
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  const generatedKeys = webPush.generateVAPIDKeys();
  vapidKeys.publicKey = generatedKeys.publicKey;
  vapidKeys.privateKey = generatedKeys.privateKey;
  console.warn('Generated temporary VAPID keys. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to .env for persistence.');
}
webPush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@newsalerts.com', vapidKeys.publicKey, vapidKeys.privateKey);

const authRoutes = require('./routes/authRoutes');
const newsRoutes = require('./routes/newsRoutes');
const userRoutes = require('./routes/userRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { scheduleNewsPolling } = require('./controllers/newsController');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://news-alertss.netlify.app',
    methods: ['GET', 'POST'],
  },
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id');
    if (!user) return next(new Error('Unauthorized'));
    socket.userId = user._id.toString();
    next();
  } catch (error) {
    next(new Error('Socket authentication failed'));
  }
});

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || 'https://news-alertss.netlify.app' }));
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { message: 'Too many requests from this IP, please try again later.' },
});
app.use(limiter);

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/subscribe', subscriptionRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'News Alert API is running' });
});

app.get('/api/subscribe/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

let socketClients = new Set();
io.on('connection', (socket) => {
  socketClients.add(socket.id);
  if (socket.userId) {
    socket.join(socket.userId);
    console.log('Socket connected and joined room for user:', socket.userId);
  } else {
    console.log('Socket connected without authenticated user:', socket.id);
  }

  socket.on('disconnect', () => {
    socketClients.delete(socket.id);
    console.log('Socket disconnected:', socket.id);
  });
});

app.set('io', io);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  scheduleNewsPolling(io);
});
