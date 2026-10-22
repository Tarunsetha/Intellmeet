const express = require('express');
const router = express.Router();
const { createMeeting, getUserMeetings } = require('../controllers/meetingController');
const authMiddleware = require('../middleware/authMiddleware');

// Safety check to ensure they are functions before passing to router
// if (typeof authMiddleware !== 'function') {
//   throw new Error('authMiddleware is not exported as a function!');
// }
// if (typeof createMeeting !== 'function' || typeof getUserMeetings !== 'function') {
//   throw new Error('meetingController functions are not exported properly!');
// }

router.post('/create', authMiddleware, createMeeting);
router.post('/history', authMiddleware, getUserMeetings);

module.exports = router;