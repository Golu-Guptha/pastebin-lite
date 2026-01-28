const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const pasteSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => nanoid(6), // Short ID for URLs
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: null,
    index: { expires: '0s' } // TTL index handling by MongoDB if we rely on it, but prompt says "Unavailable cases... Expired paste", implying logic might be needed too. 
    // MongoDB TTL background thread runs every 60s, which might not be "Deterministic" enough for the test requirement "x-test-now-ms". 
    // We will handle logical expiry in addition to this.
  },
  maxViews: {
    type: Number,
    default: null,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Paste', pasteSchema);
