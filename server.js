const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database Connection
const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<password>')) {
            console.warn('⚠️  MONGODB_URI is not set or is invalid in .env file.');
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
};

// Helper for Deterministic Time
const getNow = (req) => {
    if (process.env.TEST_MODE === '1' && req.headers['x-test-now-ms']) {
        return new Date(parseInt(req.headers['x-test-now-ms']));
    }
    return new Date();
};

const Paste = require('./models/Paste');

// API Routes

// Health Check
app.get('/api/healthz', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(200).json({ ok: true });
});

// Create Paste
app.post('/api/pastes', async (req, res) => {
    try {
        const { content, ttl_seconds, max_views } = req.body;

        if (!content || typeof content !== 'string' || content.trim() === '') {
            return res.status(400).json({ error: 'Content is required and must be a non-empty string.' });
        }

        const pasteData = { content };

        if (ttl_seconds) {
            const ttl = parseInt(ttl_seconds);
            if (ttl < 1) return res.status(400).json({ error: 'ttl_seconds must be >= 1' });
            // Calculate expiry based on REAL time now, unless we want to support creating "already expired" pastes in test mode? 
            // Usually creation uses real time. But for consistency let's use getNow(req) if test mode is active during creation too?
            // The prompt says "x-test-now-ms... must be treated as the current time for expiry logic only".
            // It doesn't strictly say creation time changes, but it implies the "system clock" is that value.
            // Let's safe bet: use real time for creation `createdAt` usually, but `expiresAt` is relative to creation.
            // Actually, if I say "expires in 60s" and the test clock is at T=1000, it expires at T+60.
            // So `expiresAt` = `now` + `ttl`.
            const now = getNow(req);
            pasteData.expiresAt = new Date(now.getTime() + ttl * 1000);
        }

        if (max_views) {
            const mv = parseInt(max_views);
            if (mv < 1) return res.status(400).json({ error: 'max_views must be >= 1' });
            pasteData.maxViews = mv;
        }

        const paste = await Paste.create(pasteData);

        // Construct full URL
        // In local dev it's localhost:3000. In prod it will be the Vercel URL.
        // For the assignment "Deployed URL", we can try to infer host or just return relative if acceptable, 
        // but prompt example shows full URL: "https://your-app.vercel.app/p/<id>"
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['host'];
        const fullUrl = `${protocol}://${host}/p/${paste._id}`;

        res.status(200).json({
            id: paste._id,
            url: fullUrl
        });

    } catch (err) {
        console.error('Create error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Fetch Paste Logic (Shared)
const getPasteLogic = async (id, req) => {
    const paste = await Paste.findById(id);
    if (!paste) return { error: 'Not Found', status: 404 };

    // 1. Check DB Expiry (TTL) - though Mongoose might handle it, we must handle the "Test Mode" check manually.
    const now = getNow(req);
    if (paste.expiresAt && now > paste.expiresAt) {
        return { error: 'Expired', status: 404 };
    }

    // 2. Check View Limits
    if (paste.maxViews !== null && paste.viewCount >= paste.maxViews) {
        return { error: 'View Limit Exceeded', status: 404 };
    }

    // 3. Increment View Count
    paste.viewCount += 1;
    await paste.save();

    return { paste };
};

// Fetch Paste API
app.get('/api/pastes/:id', async (req, res) => {
    try {
        const result = await getPasteLogic(req.params.id, req);
        if (result.error) {
            return res.status(result.status).json({ error: result.error });
        }

        const { paste } = result;
        const remaining_views = paste.maxViews !== null ? Math.max(0, paste.maxViews - paste.viewCount) : null;

        res.status(200).json({
            content: paste.content,
            remaining_views,
            expires_at: paste.expiresAt
        });

    } catch (err) {
        console.error('Fetch error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/', (req, res) => {
    res.render('index');
});

// View Paste Page
app.get('/p/:id', async (req, res) => {
    try {
        const result = await getPasteLogic(req.params.id, req);
        if (result.error) {
            // Render 404 page
            return res.status(404).render('404', { error: result.error });
        }

        res.render('paste', { paste: result.paste });

    } catch (err) {
        console.error('View Page error:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Export for Vercel
module.exports = app;

// Start Server only if run directly (Local or Render)
if (require.main === module) {
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    });
}

