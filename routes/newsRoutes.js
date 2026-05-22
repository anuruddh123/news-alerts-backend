const express = require('express');
const { getNews, getCategories, subscribeCategories, getPreferences } = require('../controllers/newsController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/categories', getCategories);
router.get('/', getNews);
router.get('/preferences', protect, getPreferences);
router.post('/subscribe', protect, subscribeCategories);

module.exports = router;
