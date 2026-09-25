# Bashball Coaches Lineup System

## Overview
The Bashball Coaches system allows coaches to manage player lineups and position rotations for their teams. It's built on top of the existing bashball scoring system and uses Firebase for real-time data storage.

## Features

### Access Control
- Password protected with "bashtime" (case insensitive)
- Accessible via the coaches icon (👥) on the main page

### Team Setup
- Select field (DVC or Las Lomas)
- Choose grade (1st through 5th, or 6th/7th/8th combo)
- Pick team from 8 available teams:
  - Mambas, Snappers, Honey Badgers, Hyenas
  - Scorpions, Hammerheads, Dartfrogs, Crawdads

### Player Management
- Collapsible roster section with "Who's Here Today?" header
- Add/remove players from roster (starts with 8 default players)
- Edit player names by clicking on the text field
- Mark players as present/absent with checkboxes
- Remove players with trash can icon
- Add new players using the button at the bottom of the roster
- Automatically saves roster to Firebase based on field-grade-team combination

### Position Rotation System
Players rotate through positions in this order:
1. Bashbox (Left), 2. Shagger (Right), 3. 1 Run Box (Right)
4. 2 Run Box (Left), 5. Homer Shagger (Left), 6. Bashbox (Right)
7. Shagger (Left), 8. 1 Run Box (Left), 9. 2 Run Box (Right), 10. Homer Shagger (Right)

### Position Removal Priority
When there aren't enough players, positions are removed in this order:
1. Homer Shagger (Right), 2. Homer Shagger (Left), 3. Shagger (Right)
4. Shagger (Left), 5. 2 Run Box (Right), 6. 1 Run Box (Right), 7. Bashbox (Right)

### Weekly Rotation
- Week selector automatically rotates the lead off batter
- "Next Week" button advances week and resets to inning 1
- Lead off batter rotates based on week number

### Inning Management
- Track current inning
- "Next Inning" advances to next inning
- "End Inning" allows selection of last batter (affects next inning's batting order)
- View specific innings or all innings at once

### Color Coding
- Bashbox positions: Light red (#FFB3BA)
- 1 Run Box positions: Light green (#BAFFC9)
- 2 Run Box positions: Light blue (#BAE1FF)
- Shagger positions: Light gray (#E6E6E6)
- Homer Shagger positions: Light yellow (#FFFFBA)

### Interactive Features
- Touch player names in the lineup to make them the lead off batter
- Click inning headers to view specific innings
- Mobile responsive design
- Collapsible roster management

### Data Storage
- All data stored in Firebase under `teams/{field}/{grade}/{team}/`
- Real-time synchronization across devices
- Local storage for coach settings (field/grade/team preferences)

## Usage

### First Time Setup
1. Navigate to the main bashball page
2. Click the coaches icon (👥) in the header
3. Enter password: "bashtime"
4. Select your field, grade, and team
5. Click "Continue to Lineup"

### Managing Players
1. Click "Roster" to expand/collapse the player management section
2. Use checkboxes to mark which players are present today
3. Click on player names to edit them inline
4. Use trash can icons to remove players
5. Use "Add new player" at the bottom to add new players

### Managing Lineups
1. Use Week controls to set the current week
2. Click "Next Week" to advance and rotate lead off batter
3. Use inning controls to track game progress
4. Click "End Inning" to mark last batter and advance

### Viewing Lineups
1. Click inning headers to view specific innings
2. Use "All Innings" button to see full lineup
3. Color-coded positions show rotation clearly
4. Star (⭐) indicates lead off batter
5. Touch player names in lineup to make them lead off

## Technical Details

### Firebase Structure
```
teams/
  {field}/
    {grade}/
      {team}/
        players: [array of player objects]
        week: number
        currentInning: number
        lastBatterIndex: number
        lastUpdated: timestamp
```

### Local Storage
- `bashball_field`: Selected field
- `bashball_grade`: Selected grade  
- `bashball_team`: Selected team

### Files Added/Modified
- `coaches.html` - Main coaches interface
- `style/coaches.css` - Coaches page styling
- `js/coaches.js` - Coaches functionality
- `index.html` - Added coaches link
- `style/leaderboard.css` - Updated header styling

## Browser Compatibility
- Modern browsers with ES6 support
- Mobile responsive design
- Requires internet connection for Firebase sync
