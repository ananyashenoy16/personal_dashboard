import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const allowedKeys = new Set(['habits', 'logs', 'entries', 'work', 'cycles', 'dsa', 'expenses', 'yearstory']);
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.set('trust proxy', isProduction ? 1 : false);
app.use(helmet());
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '12mb' }));
app.use(cookieParser());

const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, select: false },
  googleId: { type: String, sparse: true },
}, { timestamps: true }));

const UserData = mongoose.model('UserData', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  key: { type: String, required: true, enum: [...allowedKeys] },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true }));
UserData.schema.index({ userId: 1, key: 1 }, { unique: true });

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
const cookieOptions = () => ({ httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
function issueSession(user, res) {
  const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('mls_session', token, cookieOptions());
  return { id: user._id.toString(), name: user.name, email: user.email };
}
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.mls_session;
    if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('_id name email');
    if (!user) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: { id: req.user._id.toString(), name: req.user.name, email: req.user.email } }));

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 1 || name.length > 80) return res.status(400).json({ error: 'Please enter your name (up to 80 characters).' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
    if (await User.exists({ email })) return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ user: issueSession(user, res) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    console.error('Register failed:', error.message);
    res.status(500).json({ error: 'Could not create your account. Please try again.' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email }).select('+passwordHash name email googleId');
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    res.json({ user: issueSession(user, res) });
  } catch (error) {
    console.error('Login failed:', error.message);
    res.status(500).json({ error: 'Could not sign in. Please try again.' });
  }
});

app.post('/api/auth/google', authLimiter, async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID to server/.env.' });
    const credential = String(req.body.credential || '');
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || !profile.email_verified) return res.status(401).json({ error: 'Google could not verify this account.' });
    let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email: profile.email.toLowerCase() }] });
    if (!user) user = await User.create({ name: profile.name || profile.email.split('@')[0], email: profile.email, googleId: profile.sub });
    else if (!user.googleId) { user.googleId = profile.sub; await user.save(); }
    res.json({ user: issueSession(user, res) });
  } catch (error) {
    console.error('Google sign-in failed:', error.message);
    res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

app.post('/api/auth/logout', (_req, res) => { res.clearCookie('mls_session', { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', path: '/' }); res.json({ ok: true }); });

app.get('/api/data', requireAuth, async (req, res) => {
  try {
    const docs = await UserData.find({ userId: req.user._id }).lean();
    res.json({ data: Object.fromEntries(docs.map(doc => [doc.key, doc.value])) });
  } catch (error) { console.error('Read data failed:', error.message); res.status(500).json({ error: 'Could not load your saved data.' }); }
});
app.put('/api/data/:key', requireAuth, async (req, res) => {
  try {
    const { key } = req.params;
    if (!allowedKeys.has(key)) return res.status(400).json({ error: 'Unknown data category.' });
    if (!Object.hasOwn(req.body || {}, 'value')) return res.status(400).json({ error: 'A value is required.' });
    await UserData.findOneAndUpdate({ userId: req.user._id, key }, { $set: { value: req.body.value } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    res.json({ ok: true, key });
  } catch (error) { console.error('Save data failed:', error.message); res.status(500).json({ error: 'Could not save your data.' }); }
});

const port = Number(process.env.PORT || 4000);
async function start() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing. Add your MongoDB Atlas connection string to server/.env.');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET is missing or too short. Use a random secret with at least 32 characters.');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
  app.listen(port, '0.0.0.0', () => console.log(`Personal Life Dashboard API listening on port ${port}`));
}
start().catch(error => { console.error('Server startup failed:', error.message); process.exit(1); });
