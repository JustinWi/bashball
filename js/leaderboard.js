import { firebaseConfig } from './firebaseConfig.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Function to display the leaderboard
function updateLeaderboard(snapshot) {
  const leaderboard = document.getElementById('leaderboard');
  leaderboard.innerHTML = '';
  const games = [];

  snapshot.forEach(childSnapshot => {
    games.push(childSnapshot.val());
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
        team1Div.style.color = game.team1Color;
      } else if (game.score1 < game.score2) {
        team1Div.style.color = game.team2Color;
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
const gamesRef = ref(db, '/games');
onValue(gamesRef, updateLeaderboard);
