// Firebase configuration (matching the existing bashball config)
const firebaseConfig = {
  apiKey: "AIzaSyCzwB12Y3rwLsM1kx-wh7qWO5xDl04z0kM",
  authDomain: "bashball-score.firebaseapp.com",
  projectId: "bashball-score",
  storageBucket: "bashball-score.appspot.com",
  messagingSenderId: "491783371429",
  appId: "1:491783371429:web:e4a61a901d469e23aaab4c"
};

// Initialize Firebase using the firebaseConfig
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Default/sample players for testing (8 players)
const defaultPlayers = [
  "Player 1", "Player 2", "Player 3", "Player 4", 
  "Player 5", "Player 6", "Player 7", "Player 8"
];

// Global variables
let currentField = '';
let currentGrade = '';
let currentTeam = '';
let currentWeek = 1;
let storedPlayers = [];

// Edit mode variables
let isEditMode = false;
let originalPlayersState = [];

// Bashball position rotation order
const positionRotation = [
  "Bashbox (Left)",
  "Shagger (Right)", 
  "1 Run Box (Right)",
  "2 Run Box (Left)",
  "Homer Shagger (Left)",
  "Bashbox (Right)",
  "Shagger (Left)",
  "1 Run Box (Left)",
  "2 Run Box (Right)",
  "Homer Shagger (Right)"
];

// Position colors for styling
const positionColors = {
  "Bashbox (Left)": "#FFB3BA",
  "Bashbox (Right)": "#FFB3BA",
  "1 Run Box (Left)": "#BAFFC9",
  "1 Run Box (Right)": "#BAFFC9", 
  "2 Run Box (Left)": "#BAE1FF",
  "2 Run Box (Right)": "#BAE1FF",
  "Shagger (Left)": "#E6E6E6",
  "Shagger (Right)": "#E6E6E6",
  "Homer Shagger (Left)": "#FFFFBA",
  "Homer Shagger (Right)": "#FFFFBA"
};

// Position priority for removal when not enough players
const removalPriority = [
  "Homer Shagger (Right)",
  "Homer Shagger (Left)",
  "Shagger (Right)",
  "Shagger (Left)",
  "2 Run Box (Right)",
  "1 Run Box (Right)",
  "Bashbox (Right)"
];

// DOM elements
const passwordScreen = document.getElementById('passwordScreen');
const setupScreen = document.getElementById('setupScreen');
const lineupScreen = document.getElementById('lineupScreen');
const passwordInput = document.getElementById('passwordInput');
const submitPasswordButton = document.getElementById('submitPassword');
const passwordError = document.getElementById('passwordError');

// Setup form elements
const fieldSelect = document.getElementById('fieldSelect');
const gradeSelect = document.getElementById('gradeSelect');
const teamSelect = document.getElementById('teamSelect');
const continueButton = document.getElementById('continueButton');

// Lineup screen elements
const teamHeader = document.getElementById('teamHeader');
const weekInput = document.getElementById('weekInput');
const nextWeekButton = document.getElementById('nextWeekButton');
const newPlayerInput = document.getElementById('newPlayerInput');
const addPlayerButton = document.getElementById('addPlayerButton');
const playerList = document.getElementById('playerList');
const lineupBody = document.getElementById('lineupBody');
const settingsButton = document.getElementById('settingsButton');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // Load saved settings
  loadSavedSettings();
  
  // Set up event listeners
  setupEventListeners();
  
  // Show password screen initially
  showPasswordScreen();
});

function setupEventListeners() {
  // Password submission
  submitPasswordButton.addEventListener('click', handlePasswordSubmit);
  passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      handlePasswordSubmit();
    }
  });

  // Setup form validation
  fieldSelect.addEventListener('change', validateSetupForm);
  gradeSelect.addEventListener('change', validateSetupForm);
  teamSelect.addEventListener('change', validateSetupForm);
  continueButton.addEventListener('click', handleContinueToLineup);

  // Lineup controls
  nextWeekButton.addEventListener('click', handleNextWeek);
  weekInput.addEventListener('change', handleWeekChange);

  // Player management - these will be handled dynamically in renderPlayerList()
  // addPlayerButton.addEventListener('click', handleAddPlayer);
  // newPlayerInput.addEventListener('keypress', function(e) {
  //   if (e.key === 'Enter') {
  //     handleAddPlayer();
  //   }
  // });

  // Settings
  settingsButton.addEventListener('click', showSetupScreen);
}

function loadSavedSettings() {
  const savedField = localStorage.getItem('bashball_field');
  const savedGrade = localStorage.getItem('bashball_grade');
  const savedTeam = localStorage.getItem('bashball_team');

  if (savedField) fieldSelect.value = savedField;
  if (savedGrade) gradeSelect.value = savedGrade;
  if (savedTeam) teamSelect.value = savedTeam;

  if (savedField && savedGrade && savedTeam) {
    currentField = savedField;
    currentGrade = savedGrade;
    currentTeam = savedTeam;
  }
}

function saveSettings() {
  localStorage.setItem('bashball_field', currentField);
  localStorage.setItem('bashball_grade', currentGrade);
  localStorage.setItem('bashball_team', currentTeam);
}

function showPasswordScreen() {
  passwordScreen.style.display = 'flex';
  setupScreen.style.display = 'none';
  lineupScreen.style.display = 'none';
  passwordInput.focus();
}

function showSetupScreen() {
  passwordScreen.style.display = 'none';
  setupScreen.style.display = 'block';
  lineupScreen.style.display = 'none';
  
  // Pre-fill current settings
  if (currentField) fieldSelect.value = currentField;
  if (currentGrade) gradeSelect.value = currentGrade;
  if (currentTeam) teamSelect.value = currentTeam;
  
  validateSetupForm();
}

function showLineupScreen() {
  passwordScreen.style.display = 'none';
  setupScreen.style.display = 'none';
  lineupScreen.style.display = 'block';
  
  teamHeader.textContent = `${currentTeam} - ${currentGrade} (${currentField})`;
  loadTeamData();
}

function handlePasswordSubmit() {
  const password = passwordInput.value.toLowerCase();
  if (password === 'bashtime') {
    passwordError.style.display = 'none';
    if (currentField && currentGrade && currentTeam) {
      showLineupScreen();
    } else {
      showSetupScreen();
    }
  } else {
    passwordError.style.display = 'block';
    passwordInput.value = '';
    passwordInput.focus();
  }
}

function validateSetupForm() {
  const isValid = fieldSelect.value && gradeSelect.value && teamSelect.value;
  continueButton.disabled = !isValid;
}

function handleContinueToLineup() {
  currentField = fieldSelect.value;
  currentGrade = gradeSelect.value;
  currentTeam = teamSelect.value;
  
  saveSettings();
  showLineupScreen();
}

function getTeamPath() {
  return `teams/${currentField}/${currentGrade}/${currentTeam}`;
}

function loadTeamData() {
  const teamPath = getTeamPath();
  
  database.ref(teamPath).once('value').then(function(snapshot) {
    const data = snapshot.val();
    
    if (data) {
      storedPlayers = data.players || [];
      currentWeek = data.week || 1;
    } else {
      // Initialize new team with default players for testing
      storedPlayers = defaultPlayers.map(name => ({ name, present: true }));
      currentWeek = 1;
      saveTeamData();
    }
    
    updateUI();
    renderLineup();
  });

  // Listen for real-time updates
  database.ref(teamPath).on('value', function(snapshot) {
    const data = snapshot.val();
    console.log('Firebase data received:', data);
    if (data) {
      const oldWeek = currentWeek;
      
      storedPlayers = data.players || [];
      currentWeek = data.week || 1;
      
      console.log('Data updated - old week:', oldWeek, 'new week:', currentWeek);
      
      // Only skip update if actively editing the week input
      if (document.activeElement === weekInput && document.activeElement.type === 'number') {
        console.log('Skipping UI update - user is editing week');
      } else {
        console.log('Updating UI and lineup');
        updateUI();
        renderLineup();
      }
    }
  });
}

function saveTeamData() {
  const teamPath = getTeamPath();
  const data = {
    players: storedPlayers,
    week: currentWeek,
    lastUpdated: Date.now()
  };
  
  console.log('Saving team data:', data);
  database.ref(teamPath).set(data);
}

function updateUI() {
  weekInput.value = currentWeek;
  renderPlayerList();
  loadScores(); // Load scores when UI updates
}

function renderPlayerList() {
  playerList.innerHTML = '';
  
  storedPlayers.forEach((player, index) => {
    const playerDiv = document.createElement('div');
    playerDiv.className = `player-item ${!player.present ? 'inactive' : ''}`;
    
    if (isEditMode) {
      // Edit mode: show editable names and delete buttons, hide presence
      playerDiv.innerHTML = `
        <input type="text" class="player-name-input" value="${player.name}" 
               data-index="${index}"
               onblur="updatePlayerNameInEditMode(${index}, this.value)"
               onkeypress="handleEditModeKeypress(event, ${index}, this)">
        <button class="remove-btn" onclick="removePlayerInEditMode(${index})" title="Remove Player">
          <i class="fas fa-trash"></i>
        </button>
      `;
    } else {
      // View mode: show presence checkboxes, readonly names, no delete buttons
      playerDiv.innerHTML = `
        <input type="checkbox" ${player.present ? 'checked' : ''} 
               onchange="togglePlayerPresence(${index})">
        <span class="player-name-display" onclick="togglePlayerPresence(${index})">${player.name}</span>
      `;
    }
    
    playerList.appendChild(playerDiv);
  });
  
  // Only show "Add Player" in edit mode
  if (isEditMode) {
    const addPlayerDiv = document.createElement('div');
    addPlayerDiv.className = 'add-player-container';
    addPlayerDiv.innerHTML = `
      <input type="text" id="newPlayerInput" placeholder="Add new player" />
      <button id="addPlayerButton">Add Player</button>
    `;
    playerList.appendChild(addPlayerDiv);
    
    // Re-attach event listeners for the new add player elements
    const newPlayerInput = document.getElementById('newPlayerInput');
    const addPlayerButton = document.getElementById('addPlayerButton');
    
    addPlayerButton.addEventListener('click', handleAddPlayerInEditMode);
    newPlayerInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        handleAddPlayerInEditMode();
      }
    });
  }
}

// Edit mode functions
function enterEditMode() {
  isEditMode = true;
  // Store original state for cancel functionality
  originalPlayersState = JSON.parse(JSON.stringify(storedPlayers));
  
  // Update UI
  document.getElementById('editRosterIcon').style.display = 'none';
  document.getElementById('saveRosterIcon').style.display = 'inline';
  document.getElementById('cancelRosterIcon').style.display = 'inline';
  
  // Re-render the player list in edit mode
  renderPlayerList();
}

function saveRosterChanges() {
  // Collect current values from all input fields before saving
  const nameInputs = document.querySelectorAll('.player-name-input');
  nameInputs.forEach((input, index) => {
    const newName = input.value.trim();
    if (newName && storedPlayers[index]) {
      storedPlayers[index].name = newName;
    }
  });
  
  isEditMode = false;
  
  // Save to Firebase
  saveTeamData();
  
  // Update UI
  document.getElementById('editRosterIcon').style.display = 'inline';
  document.getElementById('saveRosterIcon').style.display = 'none';
  document.getElementById('cancelRosterIcon').style.display = 'none';
  
  // Re-render the player list in view mode
  renderPlayerList();
  renderLineup();
}

function cancelRosterChanges() {
  isEditMode = false;
  
  // Restore original state
  storedPlayers = JSON.parse(JSON.stringify(originalPlayersState));
  
  // Update UI
  document.getElementById('editRosterIcon').style.display = 'inline';
  document.getElementById('saveRosterIcon').style.display = 'none';
  document.getElementById('cancelRosterIcon').style.display = 'none';
  
  // Re-render the player list in view mode
  renderPlayerList();
  renderLineup();
}

function removePlayerInEditMode(index) {
  storedPlayers.splice(index, 1);
  renderPlayerList();
}

function handleAddPlayerInEditMode() {
  const newPlayerInput = document.getElementById('newPlayerInput');
  const playerName = newPlayerInput.value.trim();
  if (playerName) {
    storedPlayers.push({
      name: playerName,
      present: true
    });
    newPlayerInput.value = '';
    renderPlayerList();
  }
}

function handleEditModeKeypress(event, index, input) {
  if (event.key === 'Enter') {
    const newName = input.value.trim();
    if (newName) {
      storedPlayers[index].name = newName;
      input.blur();
    }
  }
}

function updatePlayerNameInEditMode(index, newName) {
  const trimmedName = newName.trim();
  if (trimmedName && storedPlayers[index]) {
    storedPlayers[index].name = trimmedName;
  }
}

function handleAddPlayer() {
  const newPlayerInput = document.getElementById('newPlayerInput');
  const playerName = newPlayerInput.value.trim();
  if (playerName) {
    storedPlayers.push({
      name: playerName,
      present: true
    });
    newPlayerInput.value = '';
    saveTeamData();
  }
}

function savePlayerName(index, newName) {
  console.log('savePlayerName called:', { index, newName, oldName: storedPlayers[index]?.name });
  const trimmedName = newName.trim();
  if (trimmedName && trimmedName !== storedPlayers[index].name) {
    console.log('Updating player name from', storedPlayers[index].name, 'to', trimmedName);
    storedPlayers[index].name = trimmedName;
    saveTeamData();
    // Manually trigger lineup re-render
    renderLineup();
  } else {
    console.log('No change needed for player name');
  }
}

function handlePlayerNameKeypress(event, index, input) {
  if (event.key === 'Enter') {
    input.blur();
  }
}

function togglePlayerPresence(index) {
  console.log('togglePlayerPresence called for index:', index, 'player:', storedPlayers[index]?.name);
  storedPlayers[index].present = !storedPlayers[index].present;
  console.log('Player presence toggled to:', storedPlayers[index].present);
  
  // Only save immediately if not in edit mode
  if (!isEditMode) {
    saveTeamData();
    // Auto-refresh the lineup when presence changes
    renderLineup();
  } else {
    // In edit mode, just re-render the player list to update the UI
    renderPlayerList();
  }
}

function removePlayer(index) {
  if (confirm(`Remove ${storedPlayers[index].name} from the roster?`)) {
    storedPlayers.splice(index, 1);
    saveTeamData();
  }
}

function handleNextWeek() {
  console.log('handleNextWeek called, current week:', currentWeek);
  currentWeek++;
  console.log('New week:', currentWeek);
  weekInput.value = currentWeek;
  saveTeamData();
  // Manually trigger lineup re-render
  renderLineup();
}

function handleWeekChange() {
  console.log('handleWeekChange called, input value:', weekInput.value);
  const newWeek = parseInt(weekInput.value) || 1;
  const finalWeek = Math.max(1, newWeek);
  console.log('Setting week to:', finalWeek);
  currentWeek = finalWeek;
  weekInput.value = currentWeek;
  saveTeamData();
  // Manually trigger lineup re-render
  renderLineup();
}

function getPositionsForInning(activePlayers, inning, firstBatterOffset = 0) {
  const numPlayers = activePlayers.length;
  
  // Get positions, removing from the end if we don't have enough players
  let availablePositions = [...positionRotation];
  if (numPlayers < positionRotation.length) {
    const toRemove = positionRotation.length - numPlayers;
    for (let i = 0; i < toRemove; i++) {
      const positionToRemove = removalPriority[i];
      const index = availablePositions.indexOf(positionToRemove);
      if (index > -1) {
        availablePositions.splice(index, 1);
      }
    }
  }
  
  const positions = {};
  activePlayers.forEach((player, playerIndex) => {
    // Calculate position based on first batter offset and inning
    const totalOffset = firstBatterOffset + (inning - 1);
    const positionIndex = (playerIndex + totalOffset) % availablePositions.length;
    positions[player.name] = availablePositions[positionIndex];
  });
  
  return positions;
}

function renderLineup() {
  console.log('renderLineup called, currentWeek:', currentWeek);
  const activePlayers = storedPlayers.filter(p => p.present);
  console.log('Active players:', activePlayers.map(p => p.name));
  
  if (activePlayers.length === 0) {
    lineupBody.innerHTML = '<tr><td colspan="7">No active players</td></tr>';
    return;
  }

  // Calculate first batter based on week - this rotates the leadoff each week
  let firstBatterIndex = (currentWeek - 1) % activePlayers.length;
  console.log('First batter index:', firstBatterIndex, 'Player:', activePlayers[firstBatterIndex]?.name);
  
  // Reorder players so first batter is at top
  const orderedPlayers = [
    ...activePlayers.slice(firstBatterIndex),
    ...activePlayers.slice(0, firstBatterIndex)
  ];
  console.log('Ordered players:', orderedPlayers.map(p => p.name));

  lineupBody.innerHTML = '';
  
  orderedPlayers.forEach((player, displayIndex) => {
    const tr = document.createElement('tr');
    
    // Player name cell
    const nameCell = document.createElement('td');
    nameCell.textContent = player.name;
    if (displayIndex === 0) {
      nameCell.classList.add('lead-off-batter');
      console.log('Lead off batter set to:', player.name);
    }
    
    // Add both click and touch event handlers for better mobile support
    const handleSelection = function(e) {
      e.preventDefault(); // Prevent any default behavior
      console.log('Player name clicked/touched:', player.name);
      selectLeadOffBatter(player.name);
    };
    
    nameCell.onclick = handleSelection;
    nameCell.ontouchend = handleSelection;
    nameCell.style.cursor = 'pointer';
    nameCell.style.touchAction = 'manipulation'; // Improve touch responsiveness
    nameCell.title = 'Touch to make lead off batter';
    tr.appendChild(nameCell);
    
    // Position cells for each inning
    for (let inning = 1; inning <= 6; inning++) {
      const positionCell = document.createElement('td');
      
      const positions = getPositionsForInning(activePlayers, inning, firstBatterIndex);
      const position = positions[player.name];
      
      if (position) {
        positionCell.textContent = position;
        positionCell.classList.add('position-cell');
        
        // Add color coding
        if (position.includes('Bashbox')) {
          positionCell.classList.add('position-bashbox');
        } else if (position.includes('1 Run')) {
          positionCell.classList.add('position-1run');
        } else if (position.includes('2 Run')) {
          positionCell.classList.add('position-2run');
        } else if (position.includes('Homer')) {
          positionCell.classList.add('position-homer');
        } else if (position.includes('Shagger')) {
          positionCell.classList.add('position-shagger');
        }
      }
      
      tr.appendChild(positionCell);
    }
    
    lineupBody.appendChild(tr);
  });
  console.log('Lineup rendering completed');
}

function selectLeadOffBatter(playerName) {
  console.log('selectLeadOffBatter called with:', playerName);
  const activePlayers = storedPlayers.filter(p => p.present);
  console.log('Active players:', activePlayers.map(p => p.name));
  const playerIndex = activePlayers.findIndex(p => p.name === playerName);
  console.log('Player index found:', playerIndex);
  
  if (playerIndex >= 0) {
    // Calculate what week would make this player the lead off batter
    const newWeek = playerIndex + 1;
    console.log('Setting week from', currentWeek, 'to', newWeek);
    currentWeek = newWeek;
    saveTeamData();
    // Manually trigger UI update
    updateUI();
    renderLineup();
  } else {
    console.log('Player not found in active players list');
  }
}

function updateInningDisplay() {
  // This function can be used to update any inning-specific displays
}

function toggleRoster() {
  const rosterContent = document.getElementById('rosterContent');
  const rosterToggle = document.getElementById('rosterToggle');
  
  if (rosterContent.style.display === 'none') {
    rosterContent.style.display = 'block';
    rosterToggle.classList.remove('fa-chevron-right');
    rosterToggle.classList.add('fa-chevron-down');
  } else {
    rosterContent.style.display = 'none';
    rosterToggle.classList.remove('fa-chevron-down');
    rosterToggle.classList.add('fa-chevron-right');
  }
}

// Toggle scores section visibility
function toggleScores() {
  const scoresContent = document.getElementById('scoresContent');
  const scoresToggle = document.getElementById('scoresToggle');
  
  if (scoresContent.classList.contains('expanded')) {
    scoresContent.classList.remove('expanded');
    scoresContent.classList.add('collapsed');
    scoresToggle.classList.remove('fa-chevron-down');
    scoresToggle.classList.add('fa-chevron-right');
  } else {
    scoresContent.classList.remove('collapsed');
    scoresContent.classList.add('expanded');
    scoresToggle.classList.remove('fa-chevron-right');
    scoresToggle.classList.add('fa-chevron-down');
  }
}

// Load and display scores for the selected field
function loadScores() {
  const selectedField = localStorage.getItem('bashball_field') || currentField;
  if (!selectedField) {
    document.getElementById('scoresLeaderboard').innerHTML = 
      '<div class="scores-no-games">No field selected</div>';
    return;
  }
  
  const gamesRef = database.ref('/games');
  gamesRef.on('value', (snapshot) => {
    const scoresLeaderboard = document.getElementById('scoresLeaderboard');
    const games = [];
    
    // Collect games for the selected field
    snapshot.forEach((childSnapshot) => {
      const game = childSnapshot.val();
      if (game.field === selectedField) {
        games.push(game);
      }
    });
    
    if (games.length === 0) {
      scoresLeaderboard.innerHTML = 
        `<div class="scores-no-games">No games found for ${selectedField}</div>`;
      return;
    }
    
    // Clear existing content
    scoresLeaderboard.innerHTML = '';
    
    // Sort games by last updated (most recent first) and limit to 4
    games
      .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
      .slice(0, 4)
      .sort((a, b) => a.team1.localeCompare(b.team1))
      .forEach(game => {
        // Determine which team is ahead
        let team1First = true;
        if (game.score1 < game.score2) {
          team1First = false;
        }
        
        const gameDiv = document.createElement('div');
        gameDiv.classList.add('scores-game-box');
        
        const team1Div = document.createElement('div');
        const team1Name = team1First ? game.team1 : game.team2;
        const team1Score = team1First ? game.score1 : game.score2;
        team1Div.innerHTML = `${team1Name} &nbsp;${team1Score}`;
        team1Div.classList.add('scores-team');
        
        const team2Div = document.createElement('div');
        const team2Name = team1First ? game.team2 : game.team1;
        const team2Score = team1First ? game.score2 : game.score1;
        team2Div.innerHTML = `${team2Name} &nbsp;${team2Score}`;
        team2Div.classList.add('scores-team');
        
        // Apply team colors (same logic as home page)
        if (game.score1 > game.score2) {
          if (game.team1 === 'Mambas') {
            team1Div.style.color = '#ffffff';
          } else {
            team1Div.style.color = game.team1Color;
          }
        } else if (game.score1 < game.score2) {
          if (game.team2 === 'Mambas') {
            team1Div.style.color = '#ffffff';
          } else {
            team1Div.style.color = game.team2Color;
          }
        }
        
        const lastUpdatedDiv = document.createElement('div');
        lastUpdatedDiv.textContent = `Last Updated: ${new Date(game.lastUpdated).toLocaleTimeString()}`;
        lastUpdatedDiv.classList.add('scores-last-updated');
        
        gameDiv.appendChild(team1Div);
        gameDiv.appendChild(team2Div);
        gameDiv.appendChild(lastUpdatedDiv);
        
        scoresLeaderboard.appendChild(gameDiv);
      });
  });
}

// Make functions available globally for inline event handlers
window.togglePlayerPresence = togglePlayerPresence;
window.removePlayer = removePlayer;
window.selectLeadOffBatter = selectLeadOffBatter;
window.savePlayerName = savePlayerName;
window.handlePlayerNameKeypress = handlePlayerNameKeypress;
window.toggleRoster = toggleRoster;
window.toggleScores = toggleScores;
window.enterEditMode = enterEditMode;
window.saveRosterChanges = saveRosterChanges;
window.cancelRosterChanges = cancelRosterChanges;
window.removePlayerInEditMode = removePlayerInEditMode;
window.handleAddPlayerInEditMode = handleAddPlayerInEditMode;
window.handleEditModeKeypress = handleEditModeKeypress;
window.updatePlayerNameInEditMode = updatePlayerNameInEditMode;
