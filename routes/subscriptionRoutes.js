const express = require('express');
const { updatePreferences, updatePushSubscription, sendTestEmail } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.put('/preferences', protect, updatePreferences);
router.post('/push-subscribe', protect, updatePushSubscription);
router.post('/send-test-email', protect, sendTestEmail);

module.exports = router;
