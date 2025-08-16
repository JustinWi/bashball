import { firebaseConfig } from './firebaseConfig.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// Firebase initialization
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function postScoreToFirebase() {
    const teamsSorted = [currentTeam, otherTeam].sort(); // Sort team names alphabetically to maintain consistency
    const gameId = `${teamsSorted[0]}-${teamsSorted[1]}`;
  
    const gameData = {
      team1: teamsSorted[0],
      team2: teamsSorted[1],
      score1: scores[teamsSorted[0]] || 0,
      score2: scores[teamsSorted[1]] || 0,
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
let scores = JSON.parse(localStorage.getItem('scores')) || {};
let historyVisible = true;

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

// Function to load team-specific history
function loadTeamHistory() {
    const historyTable = document.getElementById('historyTable');
    let history = JSON.parse(localStorage.getItem('history')) || [];
    const teamHistory = history.filter(entry => entry.team === currentTeam); // Filter history by current team

    historyTable.innerHTML = ''; // Clear the table
    teamHistory.forEach(entry => {
        const row = `
            <tr>
                <td>${entry.points}</td>
                <td>${entry.score}</td>
                <td>${entry.time}</td>
            </tr>`;
        historyTable.innerHTML += row;
    });
    document.querySelector('.history-section h2').style.display = historyVisible ? 'block' : 'none'; // Show or hide history title
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

// Function to save the score history
function saveScoreToHistory(points) {
    const timestamp = new Date();
    const entry = {
        team: currentTeam,
        points: points === 'Manual' ? 'Manual' : points,
        score: scores[currentTeam],
        time: formatTimestamp(timestamp)
    };
    let history = JSON.parse(localStorage.getItem('history')) || [];
    history.unshift(entry); // Add entry at the beginning
    localStorage.setItem('history', JSON.stringify(history));
}

// Format the timestamp for the history
function formatTimestamp(timestamp) {
    const now = new Date();
    const isToday = timestamp.toDateString() === now.toDateString();
    return isToday
        ? timestamp.toLocaleTimeString([], { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })
        : `${timestamp.toLocaleTimeString([], { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })} ${timestamp.getMonth() + 1}/${timestamp.getDate()}/${timestamp.getFullYear() % 100}`;
}

// Save scores to localStorage
function saveScores() {
    localStorage.setItem('scores', JSON.stringify(scores));

    postScoreToFirebase();
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

    // Save teams to local storage
    saveTeams();

    // Clear history and scores
    localStorage.removeItem('history');
    scores = {};
    localStorage.removeItem('scores');
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
    const history = JSON.parse(localStorage.getItem('history')) || [];
    loadTeams();

    if (history.length > 0) {
        const lastEntry = history[0]; // Get the most recent entry
        // currentTeam = lastEntry.team; // Set the team that batted last
        // saveTeams(); // Ensure teams are saved after refresh
        updateScoreDisplay();
    } else if (currentTeam && otherTeam) {
        // If teams are stored but no history, show teams
        updateScoreDisplay();
    } else {
        // No history, show start game screen
        document.getElementById('scoringScreen').style.display = 'none';
        document.getElementById('newGameScreen').style.display = 'block';
    }
    document.getElementById('historySection').style.display = 'block'; // Show history by default
};

// Save both team names to localStorage
function saveTeams() {
    localStorage.setItem('currentTeam', currentTeam);
    localStorage.setItem('otherTeam', otherTeam);
}

// Load both team names from localStorage
function loadTeams() {
    currentTeam = localStorage.getItem('currentTeam') || "";
    otherTeam = localStorage.getItem('otherTeam') || "";
}
