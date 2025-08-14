# 🏆 2K25 Gameplay Awards Voting App - Setup Guide

## 🚀 Quick Start (Option 1: Next.js + InstantDB)

### 1. Get Your InstantDB App ID
1. Go to [InstantDB Dashboard](https://instantdb.com/dashboard)
2. Create a new app or use an existing one
3. Copy the App ID (it looks like: `cd43bbeb-5a4f-4ac9-b510-dc2d5348e246`)

### 2. Set Up Environment Variables
Create a `.env.local` file in your project root:
```bash
NEXT_PUBLIC_INSTANTDB_APP_ID=your-actual-app-id-here
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Access Your App
Open [http://localhost:3000](http://localhost:3000) in your browser

## 📊 Adding Your Existing Votes

### Option A: Use the Admin Panel (Recommended)
1. **Login as Admin**: Click "Admin Login" and use password: `2k25admin`
2. **Open Admin Panel**: Click "Admin Panel" button
3. **Import Your Data**: Either:
   - Paste your JSON data directly
   - Upload your JSON file
   - Use the example format below

### Option B: Direct File Import
1. Create a file called `existing-votes.json` in your project root
2. Format your data like this:

```json
[
  {
    "voterName": "Cam",
    "award": "MVP",
    "rankings": ["Mark", "Ray", "Will", "Kehlel", "Mandell"]
  },
  {
    "voterName": "Dope",
    "award": "Best Shooter",
    "rankings": ["Justin", "G", "Mark", "Ray", "Will"]
  }
]
```

3. Use the import function in the browser console:
```javascript
import { importExistingVotes } from './lib/data-import';
import existingVotesData from './existing-votes.json';
await importExistingVotes(existingVotesData);
```

## 🎯 How the Voting Works

### Normalized Borda Count Scoring
- **1st Place**: Gets highest points (number of players - 1)
- **2nd Place**: Gets second highest points (number of players - 2)
- **Last Place**: Gets 1 point
- **No Vote**: Gets 0 points

### Position Restrictions
- **Best Forward**: Cannot vote for Mandell, Dope, Justin
- **Best Guard**: Cannot vote for Will, Mark, Dope  
- **Best Center**: Cannot vote for Will, Mandell, Kehlel, G, Justin
- **Sixth Man**: Can ONLY vote for West, Dope, G
- **Rookie of the Year**: Can ONLY vote for West, Dope, G

### Self-Voting Prevention
- Players cannot vote for themselves in any category
- The system automatically filters out your name

## 🔧 Admin Features

### Admin Password
- **Default**: `2k25admin`
- **Change it**: Edit line 75 in `app/page.tsx`

### Admin Capabilities
- View all results in real-time
- Import existing vote data
- Monitor voting progress
- Access to all voting data

## 📱 Mobile Optimization

The app is fully mobile-optimized with:
- Responsive grid layouts
- Touch-friendly buttons
- Mobile-first design
- Optimized for small screens

## 🚨 Troubleshooting

### Common Issues
1. **"App ID not found"**: Check your `.env.local` file
2. **"Cannot connect to InstantDB"**: Verify your app is active in the dashboard
3. **"Schema mismatch"**: The app will automatically create the correct schema

### Reset Everything
```bash
# Clear all data (destructive!)
# Use the admin panel or clear your InstantDB app data
```

## 🎉 Features

✅ **Real-time voting** - See votes as they happen  
✅ **Position restrictions** - Enforces basketball position rules  
✅ **Self-voting prevention** - Can't vote for yourself  
✅ **Borda Count scoring** - Fair ranking system  
✅ **Mobile optimized** - Works great on phones  
✅ **Admin panel** - Import data and monitor results  
✅ **Live results** - See standings in real-time  
✅ **User presence** - See who's online voting  

## 🔄 Next Steps

1. **Test the app** with a few sample votes
2. **Import your existing data** using the admin panel
3. **Share with your team** - they can vote from any device
4. **Monitor results** in real-time as votes come in
5. **Export final results** when voting is complete

## 📞 Support

If you run into issues:
1. Check the browser console for errors
2. Verify your InstantDB app is active
3. Make sure your App ID is correct
4. Check that all dependencies are installed

Your voting app is ready to go! 🏀
