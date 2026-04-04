// READY-TO-RUN script.js for Save the Water!!!
document.addEventListener('DOMContentLoaded', function() {
// --- Sound Effects ---
const sounds = {
    click: new Audio('https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae7e2.mp3'),
    collect: new Audio('https://cdn.pixabay.com/audio/2022/07/18/audio_124bfae7e2.mp3'),
    win: new Audio('https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae7e2.mp3'),
    ui: new Audio('https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae7e2.mp3')
};
Object.values(sounds).forEach(snd => { snd.preload = 'auto'; });

// --- Difficulty Settings ---
const DIFFICULTY_SETTINGS = {
    easy:   { time: 60, goal: 10 },
    normal: { time: 40, goal: 20 },
    hard:   { time: 25, goal: 30 }
};
let currentDifficulty = 'easy';
let timeLeft = 60;
let timerInterval = null;

// --- Milestone Tracking ---
const milestones = [10, 20, 50];
let reachedMilestones = [];

// --- DOM Elements ---
const winMsgDiv = document.getElementById('win-message');
const milestoneMsgDiv = document.getElementById('milestone-message');
let gameActive = false;
const screens = {
    mainMenu: document.getElementById('main-menu'),
    difficultySelect: document.getElementById('difficulty-select'),
    levelSelect: document.getElementById('level-select'),
    puzzleBoard: document.getElementById('puzzle-board'),
    levelComplete: document.getElementById('level-complete'),
    levelFailed: document.getElementById('level-failed')
};
const overlay = document.getElementById('game-overlay');
let overlayCtx = overlay.getContext('2d');
let ripples = [];
let bubbles = [];
let winState = false;

// Use the new wrapper for overlay sizing
function resizeOverlay() {
    const wrapper = document.getElementById('game-wrapper');
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    overlay.width = rect.width;
    overlay.height = rect.height;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.left = (rect.left + scrollLeft) + 'px';
    overlay.style.top = (rect.top + scrollTop) + 'px';
    overlay.style.position = 'absolute';
    overlay.style.display = 'block';
    overlay.style.zIndex = 10;
}
window.addEventListener('resize', resizeOverlay);
window.addEventListener('scroll', resizeOverlay, true);

function showScreen(screen) {
    Object.values(screens).forEach(el => {
        if (el) el.style.display = 'none';
    });
    if (screens[screen]) {
        screens[screen].style.display = 'block';
    } else {
        screens.mainMenu.style.display = 'block';
    }
    if (screen !== 'puzzleBoard') {
        sounds.ui.currentTime = 0;
        sounds.ui.play();
    }
    setTimeout(resizeOverlay, 0);
    if (screen === 'levelSelect') updateLevelButtons();
}

// --- Match-3 Game Logic ---
const ROWS = 5;
const COLS = 5;
const TILE_TYPES = [
    { type: 'water', emoji: '💧' },
    { type: 'grass', emoji: '🌱' }
];
let board = [];
let selected = null;
let movesLeft = 20;
let score = 0;
let goal = 10;
let waterCollected = 0;

const boardContainer = document.getElementById('board-container');
const movesLeftSpan = document.getElementById('moves-left');
const scoreSpan = document.getElementById('score');
const goalSpan = document.getElementById('goal');

function randomTile() {
    return TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)].type;
}

function createBoard() {
    do {
        board = [];
        for (let r = 0; r < ROWS; r++) {
            let row = [];
            for (let c = 0; c < COLS; c++) row.push(randomTile());
            board.push(row);
        }
        // Remove initial matches
        while(findMatches().length > 0) {
            removeMatches();
            dropTiles();
            fillBoard();
        }
    } while(findMatches().length > 0);
}

function findMatches() {
    let matches = [];
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
        let count = 1;
        for (let c = 1; c < COLS; c++) {
            if (board[r][c] === board[r][c-1]) {
                count++;
            } else {
                if (count >= 3) {
                    matches.push({ row: r, col: c-1, len: count, dir: 'h' });
                }
                count = 1;
            }
        }
        if (count >= 3) {
            matches.push({ row: r, col: COLS-1, len: count, dir: 'h' });
        }
    }
    // Vertical
    for (let c = 0; c < COLS; c++) {
        let count = 1;
        for (let r = 1; r < ROWS; r++) {
            if (board[r][c] === board[r-1][c]) {
                count++;
            } else {
                if (count >= 3) {
                    matches.push({ row: r-1, col: c, len: count, dir: 'v' });
                }
                count = 1;
            }
        }
        if (count >= 3) {
            matches.push({ row: ROWS-1, col: c, len: count, dir: 'v' });
        }
    }
    return matches;
}

function removeMatches() {
    let matches = findMatches();
    for (let m of matches) {
        if (m.dir === 'h') {
            for (let i = 0; i < m.len; i++) {
                board[m.row][m.col - i] = null;
            }
        } else if (m.dir === 'v') {
            for (let i = 0; i < m.len; i++) {
                board[m.row - i][m.col] = null;
            }
        }
    }
}

function dropTiles() {
    for (let c = 0; c < COLS; c++) {
        for (let r = ROWS-1; r >= 0; r--) {
            if (board[r][c] === null) {
                for (let k = r-1; k >= 0; k--) {
                    if (board[k][c] !== null) {
                        board[r][c] = board[k][c];
                        board[k][c] = null;
                        break;
                    }
                }
            }
        }
    }
}

function fillBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] === null) {
                board[r][c] = randomTile();
            }
        }
    }
}

function processMatches() {
    let found;
    do {
        removeMatches();
        dropTiles();
        fillBoard();
        found = findMatches().length > 0;
    } while (found);
    adjustDifficulty();
    updateUI();
    renderBoard();
}

function adjustDifficulty() {
    if (score >= 60 && movesLeft > 5) {
        movesLeft = Math.max(5, movesLeft - 1);
    }
    if (score >= 100 && timeLeft > 10) {
        timeLeft = Math.max(10, timeLeft - 1);
    }
}

function updateUI() {
    movesLeftSpan.textContent = movesLeft;
    scoreSpan.textContent = score;
    goalSpan.textContent = `Collect ${goal} water drops (${waterCollected}/${goal}) | Time: ${Math.max(0, timeLeft)}s`;
}

function createBubble(e, td) {
    const overlayRect = overlay.getBoundingClientRect();
    let x, y;
    if (e && e.clientX !== undefined && e.clientY !== undefined) {
        x = e.clientX - overlayRect.left;
        y = e.clientY - overlayRect.top;
    } else if (td) {
        const tdRect = td.getBoundingClientRect();
        x = tdRect.left + tdRect.width / 2 - overlayRect.left;
        y = tdRect.top + tdRect.height / 2 - overlayRect.top;
    } else {
        x = overlay.width / 2;
        y = overlay.height / 2;
    }
    bubbles.push({
        x,
        y,
        radius: 8 + Math.random() * 8,
        vy: -1.2 - Math.random() * 0.7,
        alpha: 0.7 + Math.random() * 0.3
    });
}

function renderBoard(){
    if(!boardContainer) return;
    boardContainer.innerHTML='';
    const table=document.createElement('table');
    table.className='match3-board';
    for(let r=0;r<ROWS;r++){
      const tr=document.createElement('tr');
      for(let c=0;c<COLS;c++){
        const td=document.createElement('td');
        td.className='tile '+board[r][c];
        td.dataset.row=r;
        td.dataset.col=c;
        td.textContent=TILE_TYPES.find(t=>t.type===board[r][c]).emoji;

        if(selected && selected.row===r && selected.col===c) td.classList.add('selected');

        if(board[r][c]==='water'){
          td.classList.add('water-interactive');
          td.onclick=function(e){
            if(!gameActive||td.classList.contains('disappearing')) return;
            td.classList.add('disappearing'); td.style.pointerEvents='none';
            waterCollected++; score+=10; updateUI();
            td.classList.add('splash'); createBubble(e,td); sounds.collect.currentTime=0; sounds.collect.play();
            checkMilestones();
            setTimeout(()=>{
              board[r][c]='grass';
              td.className='tile grass';
              td.textContent=TILE_TYPES.find(t=>t.type==='grass').emoji;
              td.onclick=null;
              checkEnd(); updateUI();
            },400);
          }
        } else {
          td.onclick=function(e){ if(!gameActive) return; handleTileClick(r,c); }
        }
        td.onmousedown=function(e){ createBubble(e,td); }
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    boardContainer.appendChild(table);
    setTimeout(resizeOverlay,10);
  }

  function handleTileClick(r,c){
    if(!gameActive) return;
    if(!selected) { selected={row:r,col:c}; renderBoard(); return; }
    if(Math.abs(selected.row-r)+Math.abs(selected.col-c)!==1){ selected={row:r,col:c}; renderBoard(); return; }
    swapTiles(selected.row,selected.col,r,c);
    if(findMatches().length>0){ movesLeft=Math.max(0,movesLeft-1); updateUI(); processMatches(); }
    else swapTiles(selected.row,selected.col,r,c);
    selected=null; updateUI(); renderBoard(); checkEnd();
  }

  function showMilestoneMessage(m){
    milestoneMsgDiv.textContent=`Milestone reached: ${m} points!`;
    milestoneMsgDiv.style.display='block';
    milestoneMsgDiv.style.pointerEvents='none';
    milestoneMsgDiv.style.zIndex='1001';
    setTimeout(()=>{ milestoneMsgDiv.style.display='none'; },1800);
  }

  function startPuzzleLevel(){
    const settings=DIFFICULTY_SETTINGS[currentDifficulty]||DIFFICULTY_SETTINGS.easy;
    timeLeft=settings.time; goal=settings.goal; movesLeft=20; score=0; waterCollected=0;
    selected=null; reachedMilestones=[]; ripples=[]; bubbles=[]; winState=false; gameActive=true;
    createBoard(); updateUI(); renderBoard();
    if(timerInterval) clearInterval(timerInterval);
    timerInterval=setInterval(()=>{ if(gameActive){ timeLeft=Math.max(0,timeLeft-1); updateUI(); if(timeLeft<=0) checkEnd(); } },1000);
  }

  function checkEnd(){
    if(winState) return;
    if(waterCollected>=goal){
      winState=true; gameActive=false; clearInterval(timerInterval);
      winMsgDiv.textContent='Good job!'; winMsgDiv.style.display='block';
      sounds.win.currentTime=0; sounds.win.play();
      setTimeout(()=>{ winMsgDiv.style.display='none'; showScreen('levelComplete'); },1800);
    } else if(movesLeft<=0||timeLeft<=0){
      winState=true; gameActive=false; clearInterval(timerInterval); showScreen('levelFailed');
    }
  }
// --- Navigation and Button Handlers ---
document.getElementById('btn-new-game').onclick = function() {
    showScreen('difficultySelect');
};
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.onclick = function() {
        currentDifficulty = btn.dataset.difficulty;
        showScreen('puzzleBoard');
        startPuzzleLevel();
    };
});
document.getElementById('btn-back-menu-difficulty').onclick = function() {
    showScreen('mainMenu');
};
document.getElementById('btn-continue').onclick = function() {
    showScreen('levelSelect');
};
document.getElementById('btn-settings').onclick = function() {
    alert('Settings coming soon!');
};

let unlockedLevels = 1;
let currentLevel = 1;
function updateLevelButtons() {
    document.querySelectorAll('.level-btn').forEach((btn) => {
        const level = parseInt(btn.dataset.level);
        btn.disabled = level > unlockedLevels;
    });
}
document.querySelectorAll('.level-btn').forEach(btn => {
    btn.onclick = function() {
        currentLevel = parseInt(btn.dataset.level);
        showScreen('puzzleBoard');
        startPuzzleLevel();
    };
});
document.getElementById('btn-next-level').onclick = function() {
    if (currentLevel === unlockedLevels && unlockedLevels < 4) {
        unlockedLevels++;
    }
    updateLevelButtons();
    showScreen('levelSelect');
};
document.getElementById('btn-retry').onclick = function() {
    showScreen('puzzleBoard');
    startPuzzleLevel();
};
document.querySelectorAll('.btn-back-menu').forEach(btn => {
    btn.onclick = function() {
        showScreen('mainMenu');
    };
});

// --- Start at main menu ---
showScreen('mainMenu');
setTimeout(resizeOverlay, 0);
gameLoop();
});
