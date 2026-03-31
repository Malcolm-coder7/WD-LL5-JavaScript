// Save the Water!!! - Game Script
// Handles screen navigation and basic game logic

document.addEventListener('DOMContentLoaded', function() {
    // Screen elements
    const screens = {
        mainMenu: document.getElementById('main-menu'),
        levelSelect: document.getElementById('level-select'),
        puzzleBoard: document.getElementById('puzzle-board'),
        levelComplete: document.getElementById('level-complete'),
        levelFailed: document.getElementById('level-failed')
    };

    // Overlay canvas for ripples and win message
    const overlay = document.getElementById('game-overlay');
    let overlayCtx = overlay.getContext('2d');
    let ripples = [];
    let winState = false;

    function resizeOverlay() {
        // Match overlay size to puzzle board
        const boardRect = screens.puzzleBoard.getBoundingClientRect();
        overlay.width = boardRect.width;
        overlay.height = boardRect.height;
        overlay.style.width = boardRect.width + 'px';
        overlay.style.height = boardRect.height + 'px';
        overlay.style.left = boardRect.left + 'px';
        overlay.style.top = boardRect.top + 'px';
    }

    window.addEventListener('resize', resizeOverlay);

    function showScreen(screen) {
        Object.values(screens).forEach(el => {
            if (el) el.style.display = 'none';
        });
        if (screens[screen]) screens[screen].style.display = 'block';
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
        board = [];
        for (let r = 0; r < ROWS; r++) {
            let row = [];
            for (let c = 0; c < COLS; c++) {
                row.push(randomTile());
            }
            board.push(row);
        }
        // Remove any initial matches
        while (findMatches().length > 0) {
            removeMatches();
            dropTiles();
            fillBoard();
        }
    }

    function renderBoard() {
        boardContainer.innerHTML = '';
        let table = document.createElement('table');
        table.className = 'match3-board';
        for (let r = 0; r < ROWS; r++) {
            let tr = document.createElement('tr');
            for (let c = 0; c < COLS; c++) {
                let td = document.createElement('td');
                td.className = 'tile ' + board[r][c];
                td.dataset.row = r;
                td.dataset.col = c;
                td.textContent = TILE_TYPES.find(t => t.type === board[r][c]).emoji;
                if (selected && selected.row === r && selected.col === c) {
                    td.classList.add('selected');
                }
                td.onclick = function() { handleTileClick(r, c); };
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        boardContainer.appendChild(table);
        // After rendering, update overlay size
        setTimeout(resizeOverlay, 0);
    }

    function handleTileClick(r, c) {
        if (!selected) {
            selected = { row: r, col: c };
            renderBoard();
        } else {
            // Only allow swap with adjacent
            if ((Math.abs(selected.row - r) + Math.abs(selected.col - c)) === 1) {
                swapTiles(selected.row, selected.col, r, c);
                if (findMatches().length > 0) {
                    movesLeft--;
                    processMatches();
                } else {
                    // No match, swap back
                    swapTiles(selected.row, selected.col, r, c);
                }
                selected = null;
                updateUI();
                renderBoard();
                checkEnd();
            } else {
                selected = { row: r, col: c };
                renderBoard();
            }
        }
        // No ripple here, handled by canvas click
    }

    // --- Ripple Effect ---
    overlay.addEventListener('click', function(e) {
        if (screens.puzzleBoard.style.display === 'none') return;
        const rect = overlay.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ripples.push({ x, y, radius: 0, alpha: 1 });
    });

    function updateRipples() {
        for (let ripple of ripples) {
            ripple.radius += 3;
            ripple.alpha *= 0.94;
        }
        ripples = ripples.filter(r => r.alpha > 0.05);
    }

    function drawRipples(ctx) {
        for (let ripple of ripples) {
            ctx.save();
            ctx.globalAlpha = ripple.alpha;
            ctx.beginPath();
            ctx.arc(ripple.x, ripple.y, ripple.radius, 0, 2 * Math.PI);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#4fc3f7';
            ctx.stroke();
            ctx.restore();
        }
    }

    function swapTiles(r1, c1, r2, c2) {
        let temp = board[r1][c1];
        board[r1][c1] = board[r2][c2];
        board[r2][c2] = temp;
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
        let removed = Array.from({length: ROWS}, () => Array(COLS).fill(false));
        matches.forEach(match => {
            if (match.dir === 'h') {
                for (let i = 0; i < match.len; i++) {
                    removed[match.row][match.col - i] = true;
                }
            } else {
                for (let i = 0; i < match.len; i++) {
                    removed[match.row - i][match.col] = true;
                }
            }
        });
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (removed[r][c]) {
                    if (board[r][c] === 'water') waterCollected++;
                    score += 10;
                    board[r][c] = null;
                }
            }
        }
    }

    function dropTiles() {
        for (let c = 0; c < COLS; c++) {
            for (let r = ROWS-1; r >= 0; r--) {
                if (board[r][c] === null) {
                    // Find above
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
        updateUI();
        renderBoard();
    }

    function updateUI() {
        movesLeftSpan.textContent = movesLeft;
        scoreSpan.textContent = score;
        goalSpan.textContent = `Collect ${goal} water drops (${waterCollected}/${goal})`;
    }

    function checkEnd() {
        if (waterCollected >= goal) {
            winState = true;
            setTimeout(() => {
                showScreen('levelComplete');
                winState = false;
            }, 1200);
        } else if (movesLeft <= 0) {
            setTimeout(() => {
                showScreen('levelFailed');
            }, 500);
        }
    }

    function startPuzzleLevel() {
        movesLeft = 20;
        score = 0;
        waterCollected = 0;
        createBoard();
        updateUI();
        renderBoard();
        winState = false;
        ripples = [];
        resizeOverlay();
    }

    // --- Navigation and Button Handlers ---
    document.getElementById('btn-new-game').onclick = function() {
        showScreen('levelSelect');
    };
    document.getElementById('btn-continue').onclick = function() {
        showScreen('levelSelect');
    };
    document.getElementById('btn-settings').onclick = function() {
        alert('Settings coming soon!');
    };

    // Level unlock logic
    let unlockedLevels = 1;
    function updateLevelButtons() {
        const levelBtns = document.querySelectorAll('.level-btn');
        levelBtns.forEach((btn, idx) => {
            if (idx < unlockedLevels) {
                btn.disabled = false;
            } else {
                btn.disabled = true;
            }
        });
    }

    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.onclick = function() {
            currentLevel = parseInt(btn.dataset.level);
            showScreen('puzzleBoard');
            startPuzzleLevel();
        };
    });

    // Track current level
    let currentLevel = 1;

    document.getElementById('btn-next-level').onclick = function() {
        // Unlock next level if available
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
    document.querySelectorAll('#btn-back-menu').forEach(btn => {
        btn.onclick = function() {
            showScreen('mainMenu');
        };
    });

    // Update level buttons on entering level select
    const levelSelectScreen = document.getElementById('level-select');
    const observer = new MutationObserver(() => {
        if (levelSelectScreen.style.display !== 'none') {
            updateLevelButtons();
        }
    });
    observer.observe(levelSelectScreen, { attributes: true, attributeFilter: ['style'] });

    // --- Main Game Loop for Overlay ---
    function gameLoop() {
        if (screens.puzzleBoard.style.display !== 'none') {
            overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
            updateRipples();
            drawRipples(overlayCtx);
            if (winState) {
                overlayCtx.save();
                overlayCtx.globalAlpha = 1;
                overlayCtx.font = 'bold 3rem Segoe UI, Arial, sans-serif';
                overlayCtx.fillStyle = '#0288d1';
                overlayCtx.textAlign = 'center';
                overlayCtx.textBaseline = 'middle';
                overlayCtx.strokeStyle = '#fff';
                overlayCtx.lineWidth = 8;
                const msg = 'Good job, you win!';
                const x = overlay.width / 2;
                const y = overlay.height / 2;
                overlayCtx.strokeText(msg, x, y);
                overlayCtx.fillText(msg, x, y);
                overlayCtx.restore();
            }
        }
        requestAnimationFrame(gameLoop);
    }

    // Start at main menu
    showScreen('mainMenu');
    setTimeout(resizeOverlay, 0);
    gameLoop();
});
