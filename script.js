// Game state variables
let gameActive = true;
let currentPlayer = 'X';
let gameState = ['', '', '', '', '', '', '', '', ''];
let playerXName = 'Player 1';
let playerOName = 'Player 2';
let soundEnabled = true;
let currentTheme = 'light';

// Stats tracking
let stats = {
    xWins: 0,
    oWins: 0,
    draws: 0,
    totalGames: 0
};

// Winning combinations
const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

// DOM Elements
const statusDisplay = document.getElementById('status');
const currentSymbolElement = document.getElementById('current-symbol');
const cells = document.querySelectorAll('.cell');
const restartButton = document.getElementById('restart-button');
const playerXElement = document.getElementById('player-x');
const playerOElement = document.getElementById('player-o');
const saveSettingsButton = document.getElementById('saveSettings');
const newGameButton = document.getElementById('newGameBtn');
const xWinsElement = document.getElementById('x-wins');
const oWinsElement = document.getElementById('o-wins');
const drawsElement = document.getElementById('draws');
const totalGamesElement = document.getElementById('total-games');

// Web Audio API context
let audioContext;

// Initialize audio context on user interaction to comply with browser policies
function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio context initialized');
        } catch (e) {
            console.error('Web Audio API not supported:', e);
        }
    }
    return audioContext;
}

// Function to play a beep sound with specified parameters
function playBeep(type, duration, frequency, volume) {
    if (!soundEnabled) return;
    
    try {
        const context = initAudioContext();
        if (!context) return;
        
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        // Set oscillator type and frequency based on sound type
        switch (type) {
            case 'move':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(frequency || 660, context.currentTime);
                gainNode.gain.setValueAtTime(volume || 0.2, context.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + (duration || 0.1));
                break;
                
            case 'win':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(frequency || 440, context.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + (duration || 0.5));
                gainNode.gain.setValueAtTime(volume || 0.3, context.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + (duration || 0.5));
                break;
                
            case 'draw':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(frequency || 330, context.currentTime);
                gainNode.gain.setValueAtTime(volume || 0.2, context.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + (duration || 0.3));
                break;
                
            default:
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(frequency || 440, context.currentTime);
                gainNode.gain.setValueAtTime(volume || 0.2, context.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + (duration || 0.2));
        }
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        // Start and stop the sound
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + (duration || 0.2));
        
        // Clean up
        oscillator.onended = function() {
            oscillator.disconnect();
            gainNode.disconnect();
        };
        
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

// Function to play move sound
function playMoveSound() {
    playBeep('move', 0.1, 660, 0.2);
}

// Function to play win sound
function playWinSound() {
    // Play a sequence of sounds for win
    playBeep('win', 0.5, 440, 0.3);
    setTimeout(() => playBeep('win', 0.5, 550, 0.3), 200);
    setTimeout(() => playBeep('win', 0.7, 660, 0.3), 400);
}

// Function to play draw sound
function playDrawSound() {
    playBeep('draw', 0.3, 330, 0.2);
    setTimeout(() => playBeep('draw', 0.3, 220, 0.2), 300);
}

// Initialize audio
function initAudio() {
    // Initialize audio context on first user interaction
    document.addEventListener('click', function initAudioOnFirstClick() {
        initAudioContext();
        document.removeEventListener('click', initAudioOnFirstClick);
        console.log('Audio initialized on user interaction');
    }, { once: true });
}

// Initialize the game
function initializeGame() {
    // Initialize audio
    initAudio();
    // Add event listeners to cells
    cells.forEach(cell => {
        cell.addEventListener('click', cellClicked);
    });

    // Add event listener to restart button
    restartButton.addEventListener('click', restartGame);
    
    // Add event listener to save settings button
    saveSettingsButton.addEventListener('click', saveSettings);
    
    // Add event listener to new game button in winner modal
    newGameButton.addEventListener('click', restartGame);
    
    // Load settings from local storage if available
    loadSettings();
    
    // Update stats display
    updateStats();
    
    // Set initial status message
    updateStatusMessage();
    
    // Apply current theme
    applyTheme(currentTheme);
}

// Handle cell click
function cellClicked() {
    const cellIndex = parseInt(this.getAttribute('data-cell-index'));
    
    // Check if cell is already played or game is not active
    if (gameState[cellIndex] !== '' || !gameActive) {
        return;
    }
    
    // Update game state
    gameState[cellIndex] = currentPlayer;
    this.classList.add(currentPlayer.toLowerCase());
    
    // Play move sound
    playMoveSound();
    
    // Check for win or draw
    checkResult();
}

// Update status message based on current player
function updateStatusMessage() {
    const playerName = currentPlayer === 'X' ? playerXName : playerOName;
    
    // Update the current symbol in the status display
    currentSymbolElement.textContent = currentPlayer;
    currentSymbolElement.style.background = currentPlayer === 'X' ? 
        'linear-gradient(to bottom right, var(--x-color), #a29bfe)' : 
        'linear-gradient(to bottom right, var(--o-color), #ff9ff3)';
    
    // Update the player name text
    const playerNameSpan = statusDisplay.querySelector('.turn-text span');
    playerNameSpan.textContent = `${playerName}'s turn`;
    
    // Update active player indicator
    if (currentPlayer === 'X') {
        playerXElement.classList.add('active');
        playerOElement.classList.remove('active');
    } else {
        playerOElement.classList.add('active');
        playerXElement.classList.remove('active');
    }
}

// Check for win or draw
function checkResult() {
    let roundWon = false;
    let winningCombination = [];
    
    // Check for win
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        
        if (
            gameState[a] !== '' &&
            gameState[a] === gameState[b] &&
            gameState[a] === gameState[c]
        ) {
            roundWon = true;
            winningCombination = [a, b, c];
            break;
        }
    }
    
    // Handle win
    if (roundWon) {
        gameActive = false;
        const winner = currentPlayer === 'X' ? playerXName : playerOName;
        
        // Highlight winning cells
        winningCombination.forEach(index => {
            cells[index].classList.add('win');
        });
        
        // Update stats
        if (currentPlayer === 'X') {
            stats.xWins++;
        } else {
            stats.oWins++;
        }
        stats.totalGames++;
        
        // Update stats display
        updateStats();
        
        // Play win sound
        playWinSound();
        
        // Show winner modal
        const winnerMessage = document.getElementById('winner-message');
        winnerMessage.textContent = `${winner} wins!`;
        const winnerModal = new bootstrap.Modal(document.getElementById('winnerModal'));
        winnerModal.show();
        
        return;
    }
    
    // Check for draw
    let roundDraw = !gameState.includes('');
    if (roundDraw) {
        gameActive = false;
        statusDisplay.textContent = "It's a draw!";
        
        // Update stats
        stats.draws++;
        stats.totalGames++;
        
        // Update stats display
        updateStats();
        
        // Play draw sound
        playDrawSound();
        
        // Show draw modal
        const winnerMessage = document.getElementById('winner-message');
        winnerMessage.textContent = "It's a draw!";
        const winnerModal = new bootstrap.Modal(document.getElementById('winnerModal'));
        winnerModal.show();
        
        return;
    }
    
    // Switch player if game continues
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateStatusMessage();
}

// Restart the game
function restartGame() {
    gameActive = true;
    currentPlayer = 'X';
    gameState = ['', '', '', '', '', '', '', '', ''];
    
    // Clear cell contents
    cells.forEach(cell => {
        cell.classList.remove('x', 'o', 'win');
    });
    
    // Update status message
    updateStatusMessage();
}

// Save settings from modal
function saveSettings() {
    // Get player names
    const player1Input = document.getElementById('player1Name');
    const player2Input = document.getElementById('player2Name');
    
    if (player1Input.value.trim() !== '') {
        playerXName = player1Input.value.trim();
    }
    
    if (player2Input.value.trim() !== '') {
        playerOName = player2Input.value.trim();
    }
    
    // Update player name displays
    document.querySelector('#player-x .player-name').textContent = playerXName;
    document.querySelector('#player-o .player-name').textContent = playerOName;
    
    // Get theme setting
    const themeOptions = document.querySelectorAll('input[name="themeOptions"]');
    themeOptions.forEach(option => {
        if (option.checked) {
            currentTheme = option.value;
        }
    });
    
    // Apply theme
    applyTheme(currentTheme);
    
    // Get sound setting
    soundEnabled = document.getElementById('soundToggle').checked;
    
    // Save settings to local storage
    saveSettingsToLocalStorage();
    
    // Update status message
    updateStatusMessage();
}

// Apply theme to the game
function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
}

// Save settings to local storage
function saveSettingsToLocalStorage() {
    const settings = {
        playerXName,
        playerOName,
        currentTheme,
        soundEnabled,
        stats
    };
    
    localStorage.setItem('ticTacToeSettings', JSON.stringify(settings));
}

// Load settings from local storage
function loadSettings() {
    const savedSettings = localStorage.getItem('ticTacToeSettings');
    
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Load player names
        playerXName = settings.playerXName || 'Player 1';
        playerOName = settings.playerOName || 'Player 2';
        
        // Update player name displays
        document.querySelector('#player-x .player-name').textContent = playerXName;
        document.querySelector('#player-o .player-name').textContent = playerOName;
        
        // Load theme
        currentTheme = settings.currentTheme || 'light';
        
        // Set theme radio button
        const themeRadio = document.getElementById(`theme${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`);
        if (themeRadio) {
            themeRadio.checked = true;
        }
        
        // Load sound setting
        soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true;
        document.getElementById('soundToggle').checked = soundEnabled;
        
        // Load stats
        if (settings.stats) {
            stats = settings.stats;
        }
    }
    
    // Set player name input fields
    document.getElementById('player1Name').value = playerXName;
    document.getElementById('player2Name').value = playerOName;
}

// Update stats display
function updateStats() {
    xWinsElement.textContent = stats.xWins;
    oWinsElement.textContent = stats.oWins;
    drawsElement.textContent = stats.draws;
    totalGamesElement.textContent = stats.totalGames;
    
    // Save stats to local storage
    saveSettingsToLocalStorage();
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeGame);
