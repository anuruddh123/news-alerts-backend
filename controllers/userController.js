const { sendEmail } = require('../utils/email');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const SavedArticle = require('../models/savedArticleModel');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.password) {
      user.password = req.body.password;
    }
    if (req.body.preferences) {
      user.preferences = { ...user.preferences, ...req.body.preferences };
    }
    await user.save();
    res.json({ message: 'Profile updated successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ read: 1, createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    const notifications = await Notification.find({ user: req.user._id }).sort({ read: 1, createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Notification.deleteOne({ _id: id, user: req.user._id });
    const notifications = await Notification.find({ user: req.user._id }).sort({ read: 1, createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

exports.saveArticle = async (req, res, next) => {
  try {
    const { title, url, description, source, category, imageUrl } = req.body;
    const saved = await SavedArticle.create({
      user: req.user._id,
      title,
      url,
      description,
      source,
      category,
      imageUrl,
    });
    await User.findByIdAndUpdate(req.user._id, { $push: { bookmarkedArticles: saved._id } });
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
};

exports.getBookmarks = async (req, res, next) => {
  try {
    const bookmarks = await SavedArticle.find({ user: req.user._id }).sort('-createdAt');
    res.json(bookmarks);
  } catch (error) {
    next(error);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const { preferences } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.preferences = { ...user.preferences.toObject(), ...preferences };
    await user.save();
    res.json({ preferences: user.preferences });
  } catch (error) {
    next(error);
  }
};

exports.sendTestEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('name email preferences');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ message: 'SMTP credentials are missing in backend environment.' });
    }

    await sendEmail({
      email: user.email,
      subject: 'News Alerts: Test Email',
      html: `<div style="font-family:Arial,sans-serif;color:#111;">
        <h2>Hello ${user.name},</h2>
        <p>This is a test email from News Alerts sent to your login email address.</p>
        <p>If you are receiving this, email notifications are working.</p>
      </div>`,
    });

    res.json({ message: 'Test email sent successfully.' });
  } catch (error) {
    console.error('Test email failed for', req.user?.id, error);
    next(error);
  }
};

exports.updatePushSubscription = async (req, res, next) => {
  try {
    const { pushSubscription } = req.body;
    const user = await User.findById(req.user._id);
    user.pushSubscription = pushSubscription;
    await user.save();
    res.json({ message: 'Push subscription updated.' });
  } catch (error) {
    next(error);
  }
};
