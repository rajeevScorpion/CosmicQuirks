# Cosmic Quirks Setup Instructions

## 📱 **IMPORTANT: Mobile-First Application**
This is a **mobile-first app** - all development, testing, and design decisions should prioritize mobile experience first, then enhance for desktop.

## Quick Start Guide

### 1. Database Setup

1. Create a new project in [Supabase](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Run the following SQL migrations in order:

**Migration 1: Create Users System**
```sql
-- Copy the content from IMPLEMENTATION_GUIDE.md section "1. Initial User System (001_create_users.sql)"
```

**Migration 2: Create Predictions & Assets**
```sql
-- Copy the content from IMPLEMENTATION_GUIDE.md section "2. Predictions & Assets (002_create_predictions_assets.sql)"
```

**Migration 3: Create Usage Tracking**
```sql
-- Copy the content from IMPLEMENTATION_GUIDE.md section "3. Usage Tracking (003_create_usage_tracking.sql)"
```

### 2. Environment Configuration

1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
3. Keep your existing OpenRouter configuration
4. Customize user limits and features as needed

### 3. Google OAuth Setup

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add your Google OAuth credentials
4. Add redirect URL: `https://your-domain.com/auth/callback`

### 4. Test the Application (Mobile-First!)

1. Run `npm run dev`
2. **Test on mobile device first** (Chrome DevTools mobile view + actual device)
3. Test unregistered user flow (should use asset pool when available)
4. Test Google sign-in on mobile browser
5. Test registered user flow (should generate unique images)
6. Verify usage limits work correctly
7. **Essential**: Test touch interactions and thumb navigation
8. Verify responsive behavior on 320px, 768px, and 1024px+ screens

## Key Features Implemented

✅ **Multi-tier User System**
- Unregistered users: Limited generations, asset pool images
- Registered users: Higher limits, unique images
- Configurable limits via environment variables

✅ **Asset Pool Management**
- Automatic collection of generated images
- Intelligent matching based on question themes
- "Cosmic entanglement" messaging for reused content
- Cooldown periods to avoid immediate reuse

✅ **Authentication & Security**
- Google OAuth integration
- Rate limiting
- Usage tracking (IP-based and user-based)
- Secure database policies

✅ **Enhanced UX**
- Registration benefits showcase
- Cosmic-themed error messages
- Smooth animations and theme consistency
- Mobile-responsive design

## Environment Variables Reference

### User Limits
- `UNREGISTERED_DAILY_LIMIT=2` - Daily generations for unregistered users
- `REGISTERED_DAILY_LIMIT=10` - Daily generations for registered users
- `PREMIUM_DAILY_LIMIT=50` - Daily generations for premium users

### Form Access Control
- `UNREGISTERED_FORMS=fortune` - Available forms for unregistered users
- `REGISTERED_FORMS=fortune,matchmaking,birthday,career,travel` - Available forms for registered users

### Asset Pool Settings
- `MIN_ASSET_POOL_SIZE=100` - Minimum assets to maintain
- `ASSET_REUSE_COOLDOWN_DAYS=7` - Days before reusing same asset for same user/IP

### Feature Flags
- `ENABLE_USER_REGISTRATION=true` - Enable/disable registration
- `ENABLE_ASSET_POOL=true` - Enable/disable asset pool functionality
- `SKIP_RATE_LIMITS=false` - Skip rate limits (development only)

## Troubleshooting

### Common Issues

**"Missing environment variables"**
- Ensure all Supabase variables are set in `.env.local`
- Restart development server after changing environment variables

**"Database connection failed"**
- Check Supabase project is active
- Verify connection strings and keys are correct
- Ensure database migrations have been run

**"Authentication timeout (ERR_CONNECTION_TIMED_OUT)"**
- **MOST COMMON ISSUE**: Supabase free tier projects pause after 7 days of inactivity
- Go to your Supabase dashboard and check if the project is paused
- Click "Resume project" if it's paused
- Wait a few minutes for the project to fully restart
- Test authentication again

**"Google sign-in not working"**
- Verify Google OAuth is configured in Supabase
- Check redirect URLs match exactly
- Ensure domain is added to Google OAuth settings

**"Rate limiting too aggressive"**
- Set `SKIP_RATE_LIMITS=true` for development
- Adjust rate limit values in `src/lib/rate-limit.ts`

**"AI Image Generation disabled but auth still works"**
- `ENABLE_AI_IMAGE_GENERATION=false` is for development/testing purposes
- This setting does NOT affect authentication functionality
- Keep this setting to save costs and speed up testing

### Support

Refer to `IMPLEMENTATION_GUIDE.md` for detailed technical information and architecture decisions.

---

🌟 **Your cosmic platform is ready to launch!** 🌟