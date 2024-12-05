const express = require('express');
const socket = require("socket.io");
const http = require('http');
const { Chess } = require("chess.js");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chessGame = new Chess(); // Chess.js game instance
let players = {}; // Store player IDs
let currentPlayer = "W"; // Track the current player's turn

// Set EJS as the view engine
app.set("view engine", 'ejs');
app.use(express.static(path.join(__dirname, "./public")));

// Serve the home page
app.get('/', (req, res) => {
    res.render("index", { title: "Chess Game" });
});

// Socket.io connection logic
io.on("connection", function (socket) {
    console.log("Client connected:", socket.id);

    // Assign roles to players
    if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "white");
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("playerRole", "black");
    } else {
        socket.emit("spectatorRole");
    }

    // Handle move event
    socket.on("move", (move) => {
        console.log("Move received:", move);

        try {
            // Check if the move is valid for the current player
            if (chessGame.turn() === "w" && socket.id !== players.white) {
                socket.emit("invalidMove", { reason: "It's not white's turn." });
                return;
            }
            if (chessGame.turn() === "b" && socket.id !== players.black) {
                socket.emit("invalidMove", { reason: "It's not black's turn." });
                return;
            }

            // Make the move
            const result = chessGame.move(move);

            if (result) {
                currentPlayer = chessGame.turn(); // Update the turn
                io.emit("move", move); // Broadcast the move
                io.emit("boardState", chessGame.fen()); // Broadcast board state
            } else {
                console.log("Invalid move:", move);
                socket.emit("invalidMove", { reason: "Invalid move." });
            }
        } catch (err) {
            console.error("Error processing move:", err);
            socket.emit("invalidMove", { reason: "Error processing move." });
        }
    });

    // Handle player disconnection
    socket.on("disconnect", function () {
        console.log("Client disconnected:", socket.id);

        // Remove player from players list
        if (socket.id === players.white) {
            delete players.white;
        } else if (socket.id === players.black) {
            delete players.black;
        }

        console.log("Updated players:", players);
    });
});

// Start the server
server.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});
