const Meeting = require('../models/Meeting');
const crypto = require('crypto');

async function createMeeting(req, res) {
  try {
    const { title, status } = req.body;
    const meetingId = crypto.randomUUID(); // Built-in Node.js secure random ID generator
    
    const newMeeting = new Meeting({
      meetingId,
      roomId: meetingId, // Satisfies the Mongoose model schema requirement
      host: req.user._id,
      status: status || 'ongoing',
      startTime: Date.now()
    });

    await newMeeting.save();
    return res.status(201).json({ success: true, meetingId, meeting: newMeeting });
  } catch (error) {
    console.error("Error creating meeting:", error);
    return res.status(500).json({ success: false, message: 'Server error while creating meeting' });
  }
}

async function getUserMeetings(req, res) {
  try {
    const meetings = await Meeting.find({ host: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, meetings });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return res.status(500).json({ success: false, message: 'Server error while fetching history' });
  }
}

module.exports = {
  createMeeting,
  getUserMeetings
};