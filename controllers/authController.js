const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { validationResult } = require('express-validator');
const User = require('../models/userModel');
const { sendWelcomeEmail } = require('../utils/email');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password.' });
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email already registered.' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({ name, email, password: hashedPassword });
    sendWelcomeEmail(user.email, user.name);
    res.status(201).json({ token: generateToken(user._id), user: { id: user._id, name: user.name, email: user.email, preferences: user.preferences } });
  } catch (error) {
    next(error);
  }
};

exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    res.json({ token: generateToken(user._id), user: { id: user._id, name: user.name, email: user.email, preferences: user.preferences } });
  } catch (error) {
    next(error);
  }
};

const verifyGoogleToken = async (idToken) => {
  const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
  return response.data;
};

exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required.' });
    }
    const googleUser = await verifyGoogleToken(idToken);
    if (!googleUser.email_verified) {
      return res.status(401).json({ message: 'Google email is not verified.' });
    }
    const { email, name, sub } = googleUser;
    let user = await User.findOne({ email });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(`${sub}.${process.env.JWT_SECRET}`, salt);
      user = await User.create({ name, email, password: hashedPassword });
      sendWelcomeEmail(user.email, user.name);
    }
    res.json({ token: generateToken(user._id), user: { id: user._id, name: user.name, email: user.email, preferences: user.preferences } });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    next(error);
  }
};
