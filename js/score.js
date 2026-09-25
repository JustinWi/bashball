import { firebaseConfig } from './firebaseConfig.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// Firebase initialization
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Password and field management
let currentField = localStorage.getItem('scorekeeperField') || null;

// Obfuscated password check - uses multiple transformations to hide the actual password
function checkPassword(input) {
    // Transform input through multiple steps
    const step1 = input.split('').reverse().join('');
    const step2 = btoa(step1); // Base64 encode
    const step3 = step2.split('').map(c => c.charCodeAt(0)).join('');
    const step4 = parseInt(step3) % 999999;
    
    // Expected result for password
    const expectedResult = 88983; 
    return step4 === expectedResult;
}

// Check authentication and field selection on load
window.addEventListener('load', function() {
    const isAuthenticated = localStorage.getItem('scorekeeperAuth') === 'true';
    
    if (!isAuthenticated) {
        showPasswordScreen();
    } else if (!currentField) {
        showFieldSelectionModal();
    } else {
        updateFieldDisplays();
        initializeScoring();
    }
});

function showPasswordScreen() {
    document.getElementById('passwordScreen').style.display = 'flex';
    document.getElementById('scoringScreen').style.display = 'none';
    document.getElementById('newGameScreen').style.display = 'none';
}

function showFieldSelectionModal() {
    document.getElementById('locationModal').style.display = 'block';
}

// Password handling
document.getElementById('submitPassword').addEventListener('click', function() {
    const password = document.getElementById('passwordInput').value;
    
    if (checkPassword(password)) {
        localStorage.setItem('scorekeeperAuth', 'true');
        document.getElementById('passwordError').style.display = 'none'; // Hide error on success
        document.getElementById('passwordScreen').style.display = 'none';
        
        if (!currentField) {
            showFieldSelectionModal();
        } else {
            updateFieldDisplays();
            initializeScoring();
        }
    } else {
        document.getElementById('passwordError').style.display = 'block';
        document.getElementById('passwordInput').value = '';
    }
});

// Hide error message when user starts typing
document.getElementById('passwordInput').addEventListener('input', function() {
    document.getElementById('passwordError').style.display = 'none';
});

// Enter key support for password
document.getElementById('passwordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('submitPassword').click();
    }
});

// Field selection function
window.selectField = function(field) {
    currentField = field;
    localStorage.setItem('scorekeeperField', field);
    updateFieldDisplays();
    document.getElementById('locationModal').style.display = 'none';
    initializeScoring();
};

// Field selector click handler
document.getElementById('fieldSelector').addEventListener('click', function() {
    document.getElementById('locationModal').style.display = 'block';
});

// Logout function
window.logout = function() {
    localStorage.removeItem('scorekeeperAuth');
    localStorage.removeItem('scorekeeperField');
    currentField = null;
    document.getElementById('locationModal').style.display = 'none';
    showPasswordScreen();
};

function initializeScoring() {
    document.getElementById('scoringScreen').style.display = 'block';
    updateFieldDisplays();
    loadGameState();
    
    // Initialize history button state
    const historyButton = document.getElementById('historyButton');
    if (historyVisible) {
        historyButton.classList.add('active');
    } else {
        historyButton.classList.remove('active');
    }
}

function updateFieldDisplays() {
    if (currentField) {
        const fieldSelector = document.getElementById('fieldSelector');
        const selectedFieldSpan = document.getElementById('selectedField');
        
        selectedFieldSpan.textContent = currentField;
        
        // Update colors based on selected field
        if (currentField === 'DVC') {
            fieldSelector.style.backgroundColor = '#ff008c';
            fieldSelector.setAttribute('data-field', 'college-park');
        } else if (currentField === 'Las Lomas') {
            fieldSelector.style.backgroundColor = '#008cff';
            fieldSelector.setAttribute('data-field', 'los-lomas');
        }
        
        const newGameFieldElement = document.getElementById('newGameField');
        if (newGameFieldElement) {
            newGameFieldElement.textContent = currentField;
        }
    }
}

// Add hover functionality for field selector
document.getElementById('fieldSelector').addEventListener('mouseenter', function() {
    const field = this.getAttribute('data-field');
    if (field === 'college-park') {
        this.style.backgroundColor = '#a04577';
    } else if (field === 'los-lomas') {
        this.style.backgroundColor = '#1976D2';
    }
});

document.getElementById('fieldSelector').addEventListener('mouseleave', function() {
    const field = this.getAttribute('data-field');
    if (field === 'college-park') {
        this.style.backgroundColor = '#ff008c';
    } else if (field === 'los-lomas') {
        this.style.backgroundColor = '#008cff';
    }
});

function postScoreToFirebase() {
    const teamsSorted = [currentTeam, otherTeam].sort();
    const gameId = `${teamsSorted[0]}-${teamsSorted[1]}-${currentField.replace(/\s+/g, '')}`;
  
    const gameData = {
      team1: teamsSorted[0],
      team2: teamsSorted[1],
      score1: scores[teamsSorted[0]] || 0,
      score2: scores[teamsSorted[1]] || 0,
      field: currentField,
      lastUpdated: new Date().toISOString(),
      team1Color: getTeamColor(teamsSorted[0]),
      team2Color: getTeamColor(teamsSorted[1])
    };
    set(ref(db, `/games/${gameId}`), gameData);
}

// Modify the `updateScore` function to include the call to Firebase
function updateScore(points) {
  // Existing score update logic
  if (!scores[currentTeam]) {
    scores[currentTeam] = 0;
  }
  scores[currentTeam] += points;
  document.getElementById('currentScore').textContent = scores[currentTeam];
  saveScoreToHistory(points);
  saveScores();
  loadTeamHistory();
} 

// Define team colors using modern hex values
const teams = {
    "Mambas": "#C0C0C0",         // Silver
    "Snappers": "#4CAF50",       // Green
    "Honey Badgers": "#FFD700",  // Yellow (Gold)
    "Hyenas": "#FF9800",         // Orange
    "Scorpions": "#ff0072",      // Pink (HotPink)
    "Hammerheads": "#40E0D0",    // Turquoise
    "Dartfrogs": "#1E90FF",      // Blue (DodgerBlue)
    "Crawdads": "#FF4500"        // Red (OrangeRed)
};

let currentTeam = "";
let otherTeam = "";
let scores = {};
let historyVisible = false; // Default to closed

// Function to get the team color
function getTeamColor(team) {
    return teams[team]; // Return the hex color for the given team
}

// Function to update the score display
function updateScoreDisplay() {
    if (currentTeam === "") {
        loadTeams(); // Ensure teams are loaded if undefined
    }
    const teamColor = getTeamColor(currentTeam); // Get the team's main color
    document.getElementById('teamName').style.color = teamColor; // Set team name color
    document.getElementById('currentScore').textContent = scores[currentTeam] || 0;
    document.getElementById('teamName').textContent = currentTeam;
    document.documentElement.style.setProperty('--team-color', teamColor); // Set CSS variable for team color
    updateButtonColors();
    loadTeamHistory(); // Update the history for the current team
    centerButtons(); // Ensure buttons are centered after team update
}

// Ensure buttons are centered when game starts or refreshes
function centerButtons() {
    // const buttons = document.querySelector('.score-buttons');
    // buttons.style.display = "flex";
    // buttons.style.flexDirection = "column";
    // buttons.style.justifyContent = "center";
    // buttons.style.alignItems = "center";
}

// Function to update button colors based on the team's color
function updateButtonColors() {
    const color = teams[currentTeam];
    const buttons = document.querySelectorAll('.score-btn');
    buttons.forEach((button, index) => {
        const transparency = [1.0, 0.85, 0.7, 0.55, 1.0][index]; // Different opacity for each button
        button.style.backgroundColor = `rgba(${hexToRgb(color)}, ${transparency})`;
        button.style.fontSize = "3em"; // Set font size to 3em
        if (index === 4) {
            // Styling the -1 button
            button.style.backgroundColor = '#000'; // Black background
            button.style.borderColor = color; // Outline color
            button.style.color = color; // Font color
            button.style.border = "solid 2px"; // Border style
        }
    });
}

// Utility to convert hex to RGB
function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}

// Format the timestamp for the history
function formatTimestamp(timestamp) {
    const now = new Date();
    const isToday = timestamp.toDateString() === now.toDateString();
    return isToday
        ? timestamp.toLocaleTimeString([], { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })
        : `${timestamp.toLocaleTimeString([], { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })} ${timestamp.getMonth() + 1}/${timestamp.getDate()}/${timestamp.getFullYear() % 100}`;
}

// Function to switch teams
function switchTeams() {
    [currentTeam, otherTeam] = [otherTeam, currentTeam];
    saveTeams(); // Save team names when switching
    updateScoreDisplay();
}

// Function to start a new game
function startNewGame() {
    currentTeam = document.getElementById('team1Select').value;
    otherTeam = document.getElementById('team2Select').value;

    // Save teams to local storage with field prefix
    saveTeams();

    // Clear history and scores for current field
    const fieldKey = currentField ? currentField.replace(/\s+/g, '') : '';
    localStorage.removeItem(`history_${fieldKey}`);
    scores = {};
    localStorage.removeItem(`scores_${fieldKey}`);
    updateScoreDisplay();

    if (historyVisible) {
        loadTeamHistory(); // Ensure the history is cleared
    }
    centerButtons(); // Center buttons when starting a new game
}

// Function to toggle the history visibility
function toggleHistory() {
    const historySection = document.getElementById('historySection');
    const historyTitle = document.querySelector('.history-section h2');
    const historyButton = document.getElementById('historyButton');

    if (historyVisible) {
        historySection.style.display = 'none';
        historyTitle.style.display = 'none'; // Hide "History" title
        historyButton.classList.remove('active'); // Set icon to inactive state
    } else {
        loadTeamHistory();
        historySection.style.display = 'block';
        historyTitle.style.display = 'block'; // Show "History" title
        historyButton.classList.add('active'); // Set icon to active state
    }
    historyVisible = !historyVisible;
}

// Manual score entry handling
function openManualScoreEdit() {
    document.getElementById('scoreEdit').style.display = 'block';
    document.getElementById('manualScoreInput').value = scores[currentTeam];
}

function saveManualScore() {
    const newScore = parseInt(document.getElementById('manualScoreInput').value);
    if (!isNaN(newScore)) {
        scores[currentTeam] = newScore;
        document.getElementById('currentScore').textContent = scores[currentTeam];
        saveScoreToHistory('Manual');
        saveScores();
        loadTeamHistory()
        document.getElementById('scoreEdit').style.display = 'none';
    }
}

// New Game button validation
function validateNewGame() {
    const team1 = document.getElementById('team1Select').value;
    const team2 = document.getElementById('team2Select').value;
    if (team1 && team2 && team1 !== team2) {
        document.getElementById('startGameButton').disabled = false;
        document.getElementById('errorMessage').style.display = 'none';
    } else {
        document.getElementById('startGameButton').disabled = true;
        if (team1 === team2) {
            document.getElementById('errorMessage').style.display = 'block';
        }
    }
}

// Add event listeners for buttons
document.getElementById('btnPlus4').addEventListener('click', () => updateScore(4));
document.getElementById('btnPlus3').addEventListener('click', () => updateScore(3));
document.getElementById('btnPlus2').addEventListener('click', () => updateScore(2));
document.getElementById('btnPlus1').addEventListener('click', () => updateScore(1));
document.getElementById('btnMinus1').addEventListener('click', () => updateScore(-1));

document.getElementById('newGameButton').addEventListener('click', () => {
    if (confirm('Are you sure you want to start a new game?')) {
        document.getElementById('scoringScreen').style.display = 'none';
        document.getElementById('newGameScreen').style.display = 'block';
    }
});

document.getElementById('historyButton').addEventListener('click', toggleHistory);
document.getElementById('switchTeamsButton').addEventListener('click', switchTeams);

document.getElementById('team1Select').addEventListener('change', () => {
    document.getElementById('team2Select').disabled = false;
    validateNewGame();
});
document.getElementById('team2Select').addEventListener('change', validateNewGame);

document.getElementById('startGameButton').addEventListener('click', () => {
    startNewGame();
    document.getElementById('newGameScreen').style.display = 'none';
    document.getElementById('scoringScreen').style.display = 'block';
});

document.getElementById('currentScore').addEventListener('click', openManualScoreEdit);
document.getElementById('saveScoreButton').addEventListener('click', saveManualScore);

// On page load
window.onload = function () {
    // This will be handled by the load event listener above
};

// Load game state for current field
function loadGameState() {
    const fieldKey = currentField ? currentField.replace(/\s+/g, '') : '';
    const fieldScores = JSON.parse(localStorage.getItem(`scores_${fieldKey}`)) || {};
    const fieldCurrentTeam = localStorage.getItem(`currentTeam_${fieldKey}`) || '';
    const fieldOtherTeam = localStorage.getItem(`otherTeam_${fieldKey}`) || '';
    
    scores = fieldScores;
    currentTeam = fieldCurrentTeam;
    otherTeam = fieldOtherTeam;
    
    const history = JSON.parse(localStorage.getItem(`history_${fieldKey}`)) || [];
    
    if (history.length > 0 && currentTeam && otherTeam) {
        updateScoreDisplay();
        document.getElementById('scoringScreen').style.display = 'block';
        document.getElementById('newGameScreen').style.display = 'none';
    } else if (currentTeam && otherTeam) {
        updateScoreDisplay();
        document.getElementById('scoringScreen').style.display = 'block';
        document.getElementById('newGameScreen').style.display = 'none';
    } else {
        document.getElementById('scoringScreen').style.display = 'none';
        document.getElementById('newGameScreen').style.display = 'block';
    }
    // Set initial history visibility based on historyVisible variable
    document.getElementById('historySection').style.display = historyVisible ? 'block' : 'none';
}

// Save scores to localStorage with field prefix
function saveScores() {
    const fieldKey = currentField ? currentField.replace(/\s+/g, '') : '';
    localStorage.setItem(`scores_${fieldKey}`, JSON.stringify(scores));
    postScoreToFirebase();
}

// Save both team names to localStorage with field prefix
function saveTeams() {
    const fieldKey = currentField ? currentField.replace(/\s+/g, '') : '';
    localStorage.setItem(`currentTeam_${fieldKey}`, currentTeam);
    localStorage.setItem(`otherTeam_${fieldKey}`, otherTeam);
}

// Load both team names from localStorage with field prefix
function loadTeams() {
    const fieldKey = currentField ? currentField.replace(/\s+/g, '') : '';
    currentTeam = localStorage.getItem(`currentTeam_${fieldKey}`) || "";
    otherTeam = localStorage.getItem(`otherTeam_${fieldKey}`) || "";
}

// Function to save the score history with field prefix
function saveScoreToHistory(points) {
    const fieldKey = currentField ? currentField.replace(/\s+/g, '') : '';
    const timestamp = new Date();
    const entry = {
        team: currentTeam,
        points: points === 'Manual' ? 'Manual' : points,
        score: scores[currentTeam],
        time: formatTimestamp(timestamp)
    };
    let history = JSON.parse(localStorage.getItem(`history_${fieldKey}`)) || [];
    history.unshift(entry);
    localStorage.setItem(`history_${fieldKey}`, JSON.stringify(history));
}

// Function to load team-specific history with field prefix
function loadTeamHistory() {
    const fieldKey = currentField ? currentField.replace(/\s+/g, '') : '';
    const historyTable = document.getElementById('historyTable');
    let history = JSON.parse(localStorage.getItem(`history_${fieldKey}`)) || [];
    const teamHistory = history.filter(entry => entry.team === currentTeam);

    historyTable.innerHTML = '';
    teamHistory.forEach(entry => {
        const row = `
            <tr>
                <td>${entry.points}</td>
                <td>${entry.score}</td>
                <td>${entry.time}</td>
            </tr>`;
        historyTable.innerHTML += row;
    });
    document.querySelector('.history-section h2').style.display = historyVisible ? 'block' : 'none';
}
