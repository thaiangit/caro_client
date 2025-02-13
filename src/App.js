import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io.connect("https://ancaro-server.onrender.com");

const App = () => {
  const [board, setBoard] = useState(Array(400).fill(null));
  const [room, setRoom] = useState("");
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [xIsNext, setXIsNext] = useState(true);
  const [joined, setJoined] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [message, setMessage] = useState("");
  const [winner, setWinner] = useState(null);
  const [ , setWinningIndexes] = useState([]); // ✅ Track winning cells
  useEffect(() => {
    socket.on("roomData", (data) => {
      setBoard(data.board);
      setXIsNext(data.xIsNext);
    });

    socket.on("playerRole", (symbol) => {
      setPlayerSymbol(symbol);
    });

    socket.on("gameStart", () => {
      setGameStarted(true);
      setMessage("Game Started! Your turn.");
    });

    socket.on("roomFull", () => {
      setMessage("Room is full. Try another room.");
      setJoined(false);
    });

    socket.on("playerLeft", () => {
      setMessage("Opponent left the game. Waiting for another player...");
      setGameStarted(false);
    });

    return () => {
      socket.off("roomData");
      socket.off("playerRole");
      socket.off("gameStart");
      socket.off("roomFull");
      socket.off("playerLeft");
    };
  }, []);

  const joinRoom = () => {
    if (room) {
      socket.emit("joinRoom", room);
      setJoined(true);
      setMessage("Waiting for opponent...");
    }
  };



  useEffect(() => {
    socket.on("gameOver", ({ winner, winningIndexes }) => {
      setWinner(winner);
      setWinningIndexes(winningIndexes);
      setMessage(`Game Over! ${winner} Wins!`);
    });
  
    return () => {
      socket.off("gameOver");
    };
  }, []);
  
  const [isXNext, setIsXNext] = useState(true); // ✅ Track turn

  const handleClick = (index) => {
    if (!gameStarted || board[index] || winner || !playerSymbol) {
      return; // Ignore click if game isn't started, cell is occupied, game is over, or role isn't assigned
    }
  
  // ✅ Trust `xIsNext` from the server
  if ((xIsNext && playerSymbol !== "X") || (!xIsNext && playerSymbol !== "O")) {
    console.warn("Not your turn!");
    return;
  }

    // ✅ Update board immediately for smooth UI update
    const newBoard = [...board];
    newBoard[index] = isXNext ? "X" : "O";
    setBoard(newBoard);
    setIsXNext(!isXNext);
  
    // ✅ Send move to server
    socket.emit("makeMove", { room, index });
  };
  
  
  const resetGame = () => {
    socket.emit("resetGame", room);
  };

  useEffect(() => {
    socket.on("gameReset", ({ board }) => {
      setBoard(board);
      setWinner(null);
      setWinningIndexes([]);
      setMessage("Game reset! Your turn.");
    });
  
    return () => {
      socket.off("gameReset");
    };
  }, []);
  return (
    <div className="game">
      {!joined ? (
        <div>
          <h1>Join a Tic-Tac-Toe Room</h1>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button onClick={joinRoom}>Join</button>
        </div>
      ) : (
        <div>
          <h1>Room: {room}</h1>
          {playerSymbol && <h2>You are {playerSymbol}</h2>}
          <h3>{message}</h3>
          <div className="board">
          {board.map((value, index) => (
            <button 
  key={index} 
  className={`cell ${value === "X" ? "x" : value === "O" ? "o" : ""} ${Array.isArray(winningIndexes) && winningIndexes.includes(index) ? "winner" : ""}`}
  onClick={() => handleClick(index)} 
  disabled={winner}
>
  {value}
</button>

        ))}
          </div>
          {gameStarted && <button className="reset" onClick={resetGame}>Reset Game</button>}
        </div>
      )}
    </div>
  );
};

export default App;
