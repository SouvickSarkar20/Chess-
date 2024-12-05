const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessBoard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

// Assign the role of the player (white or black)
socket.on("playerRole", function (role) {
    playerRole = role;
    renderBoard();
});

// Assign spectator role
socket.on("spectatorRole", function () {
    playerRole = null;
    renderBoard();
});

// Mapping chess pieces to Unicode characters
const getPieceUnicode = (square) => {
    const unicodePieces = {
        p: "♟",
        r: "♜",
        n: "♞",
        b: "♝",
        q: "♛",
        k: "♚",
        P: "♙",
        R: "♖",
        N: "♘",
        B: "♗",
        Q: "♕",
        K: "♔",
    };
    return unicodePieces[square.type.toUpperCase()] || "";
};

// Render the chess board
const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";

    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add(
                "square",
                (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
            );

            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add(
                    "piece",
                    square.color === "w" ? "white" : "black" // Fixed color logic
                );

                pieceElement.innerText = getPieceUnicode(square);

                // Allow dragging only for the player's pieces
                pieceElement.draggable =
                    (playerRole === "white" && square.color === "w") ||
                    (playerRole === "black" && square.color === "b");

                // Drag start logic
                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData("text/plain", "");
                    }
                });

                // Drag end logic
                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            // Allow pieces to be dropped on valid squares
            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault();
            });

            // Handle piece dropping
            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSource = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };

                    handleMove(sourceSquare, targetSource);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });
};

// Handle move logic
const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q", // Automatically promote to queen for simplicity
    };
    console.log("Sending move:", move);
    socket.emit("move", move);
};

// Update board state when a new state is received
socket.on("boardState", function (fen) {
    chess.load(fen);
    renderBoard();
});

// Update board after a move is made
socket.on("move", function (move) {
    chess.move(move);
    renderBoard();
});

// Render the initial board
renderBoard();
