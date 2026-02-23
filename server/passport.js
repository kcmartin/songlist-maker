import 'dotenv/config';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import db from './db.js';

const upsertUser = db.prepare(`
  INSERT INTO users (name, email, avatar_url, provider, provider_id)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(provider, provider_id)
  DO UPDATE SET name = excluded.name, email = excluded.email, avatar_url = excluded.avatar_url
  RETURNING *
`);

function handleOAuthCallback(provider) {
  return (accessToken, refreshToken, profile, done) => {
    try {
      const name = profile.displayName || profile.username || 'User';
      const email = profile.emails?.[0]?.value || null;
      const avatar = profile.photos?.[0]?.value || null;
      const user = upsertUser.get(name, email, avatar, provider, profile.id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  };
}

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${APP_URL}/api/auth/google/callback`,
  }, handleOAuthCallback('google')));
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${APP_URL}/api/auth/github/callback`,
  }, handleOAuthCallback('github')));
}

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    done(null, user || null);
  } catch (err) {
    done(err);
  }
});

export default passport;
