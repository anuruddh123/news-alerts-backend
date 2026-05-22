const express = require('express');
const { getProfile, updateProfile, getNotifications, markAllNotificationsRead, deleteNotification, saveArticle, getBookmarks } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.get('/notifications', protect, getNotifications);
router.put('/notifications/read-all', protect, markAllNotificationsRead);
router.delete('/notifications/:id', protect, deleteNotification);
router.post('/bookmark', protect, saveArticle);
router.get('/bookmarks', protect, getBookmarks);

module.exports = router;
