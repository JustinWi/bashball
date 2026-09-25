import { firebaseConfig } from './firebaseConfig.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let currentField = localStorage.getItem('selectedField') || null;

// Check if field selection is needed
window.addEventListener('load', function() {
  if (!currentField) {
    document.getElementById('locationModal').style.display = 'block';
  } else {
    updateFieldDisplay(currentField);
  }
});

// Field selection function
window.selectField = function(field) {
  currentField = field;
  localStorage.setItem('selectedField', field);
  
  // Set expiration for 3 months
  const expirationDate = new Date();
  expirationDate.setMonth(expirationDate.getMonth() + 3);
  localStorage.setItem('fieldSelectionExpires', expirationDate.toISOString());
  
  updateFieldDisplay(field);
  document.getElementById('locationModal').style.display = 'none';
  
  // Refresh leaderboard for the selected field
  listenForGames();
};

// Function to update field display with appropriate color
function updateFieldDisplay(field) {
  const fieldSelector = document.getElementById('fieldSelector');
  const selectedFieldSpan = document.getElementById('selectedField');
  
  selectedFieldSpan.textContent = field;
  
  // Update colors based on selected field
  if (field === 'DVC') {
    fieldSelector.style.backgroundColor = '#ff008c';
    fieldSelector.setAttribute('data-field', 'college-park');
  } else if (field === 'Las Lomas') {
    fieldSelector.style.backgroundColor = '#008cff';
    fieldSelector.setAttribute('data-field', 'los-lomas');
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

// Field selector click handler
document.getElementById('fieldSelector').addEventListener('click', function() {
  document.getElementById('locationModal').style.display = 'block';
});

// Check if field selection has expired
function checkFieldSelectionExpiry() {
  const expiration = localStorage.getItem('fieldSelectionExpires');
  if (expiration && new Date() > new Date(expiration)) {
    localStorage.removeItem('selectedField');
    localStorage.removeItem('fieldSelectionExpires');
    currentField = null;
  }
}

// Function to display the leaderboard
function updateLeaderboard(snapshot) {
  const leaderboard = document.getElementById('leaderboard');
  leaderboard.innerHTML = '';
  const games = [];

  snapshot.forEach(childSnapshot => {
    const game = childSnapshot.val();
    // Only show games for the current field
    if (game.field === currentField) {
      games.push(game);
    }
  });

  games
    .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
    .slice(0, 4) // Limit to 4 most recent
    .sort((a, b) => a.team1.localeCompare(b.team1)) 
    .forEach(game => {
      // Determine which team is ahead
      let team1First = true;

      if (game.score1 < game.score2) {
        team1First = false;
      }

      const gameDiv = document.createElement('div');
      gameDiv.classList.add('game-box');

      const team1Div = document.createElement('div');
      const team1Name = team1First ? game.team1 : game.team2;
      const team1Score = team1First ? game.score1 : game.score2;
      team1Div.innerHTML = `${team1Name} &nbsp;${team1Score}`;
      team1Div.classList.add('team');

      const team2Div = document.createElement('div');
      const team2Name = team1First ? game.team2 : game.team1;
      const team2Score = team1First ? game.score2 : game.score1;
      team2Div.innerHTML = `${team2Name} &nbsp;${team2Score}`;
      team2Div.classList.add('team');
      
      if (game.score1 > game.score2) {
        // team1 is ahead - check if it's Mambas
        if (game.team1 === 'Mambas') {
          team1Div.style.color = '#ffffff'; // White for Mambas when ahead
        } else {
          team1Div.style.color = game.team1Color;
        }
      } else if (game.score1 < game.score2) {
        // team2 is ahead - check if it's Mambas
        if (game.team2 === 'Mambas') {
          team1Div.style.color = '#ffffff'; // White for Mambas when ahead
        } else {
          team1Div.style.color = game.team2Color;
        }
      }

      const lastUpdatedDiv = document.createElement('div');
      lastUpdatedDiv.textContent = `Last Updated: ${new Date(game.lastUpdated).toLocaleTimeString()}`;
      lastUpdatedDiv.classList.add('last-updated');
      lastUpdatedDiv.style.fontSize = '0.8em';
      lastUpdatedDiv.style.marginTop = '10px';

      gameDiv.appendChild(team1Div);
      gameDiv.appendChild(team2Div);
      gameDiv.appendChild(lastUpdatedDiv);

      leaderboard.appendChild(gameDiv);
    });
}

// Listen for real-time updates
function listenForGames() {
  const gamesRef = ref(db, '/games');
  onValue(gamesRef, updateLeaderboard);
}

// Initialize on load
checkFieldSelectionExpiry();
if (currentField) {
  listenForGames();
}
