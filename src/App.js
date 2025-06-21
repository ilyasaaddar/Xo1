import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'; // Removed signInWithCustomToken as initialAuthToken is null
import { getFirestore, doc, getDoc, updateDoc, onSnapshot, collection, query, where, addDoc, deleteDoc } from 'firebase/firestore';

import * as Tone from 'tone'; // Import Tone.js

// Firebase Configuration (Provided by user - THIS SECTION HAS BEEN UPDATED WITH YOUR DETAILS)
const firebaseConfig = {
  apiKey: "AIzaSyBqRR44TJNW8kMhqODim9j-MF-0sRhwBCg",
  authDomain: "mytictactoegame-78fe9.firebaseapp.com",
  projectId: "mytictactoegame-78fe9",
  storageBucket: "mytictactoegame-78fe9.firebasestorage.app",
  messagingSenderId: "43233066353",
  appId: "1:43233066353:web:4e01aa2376c88791e68ad0",
  // measurementId: "G-NK5ZZJRFW0" // This is typically for Google Analytics, not directly used in game logic
};

// Use projectId from the provided config as the appId for Firestore paths
// This ensures consistency with Firestore security rules like /artifacts/{appId}/public/data/...
const appId = firebaseConfig.projectId;

// Since we are deploying to GitHub Pages, we won't have __initial_auth_token from Canvas.
// We'll rely on signInAnonymously for authentication.
const initialAuthToken = null; // Explicitly set to null

// Initialize Firebase App, Auth, and Firestore
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize sound effects
const moveSound = new Tone.Synth().toDestination();
const winSound = new Tone.Synth().toDestination();
const drawSound = new Tone.Synth().toDestination();

// Language translations
const translations = {
    en: {
        title: "Tic Tac Toe",
        loadingUser: "Loading user...",
        welcome: "Welcome!",
        enterYourName: "Enter Your Name",
        createNewGame: "Create New Game",
        joinGame: "Join Game",
        submit: "Submit",
        cancel: "Cancel",
        gameCode: "Game Code:",
        waitingForOpponent: "Waiting for opponent to join...",
        itsTurn: "It's {playerName}'s turn ({symbol})",
        wins: "{playerName} ({symbol}) Wins!",
        draw: "It's a Draw!",
        restartGame: "Restart Game",
        scoreboard: "Scoreboard",
        winsShort: "Wins",
        lossesShort: "Losses",
        drawsShort: "Draws",
        you: "(You)",
        opponent: "(Opponent)",
        player1: "Player 1",
        player2: "Player 2",
        pleaseEnterName: "Please enter your name first.",
        pleaseWaitSignIn: "Please wait, signing in...",
        failedToCreateGame: "Failed to create game. Please try again.",
        gameCreated: "Game created! Share this code with your friend: {code}",
        enterGameCode: "Enter Game Code",
        noGameFound: "No waiting game found with that code, or game is full/started. Please try another code.",
        alreadyInGame: "You are already in this game. Resuming...",
        gameFull: "This game is already full.",
        joinedGame: "Joined game {code}! Game is starting...",
        failedToJoinGame: "Failed to join game. Please check the code and try again.",
        notYourTurn: "It's not your turn!",
        errorMakingMove: "Error making move. Please try again.",
        gameRestarted: "Game restarted! X's turn.",
        failedToRestartGame: "Failed to restart game.",
        leaveGame: "Leave Game",
        gameDeleted: "Game deleted as only one player remained.",
        youHaveLeftGame: "You have left the game.",
        failedToLeaveGame: "Failed to leave game.",
        designedBy: "Designed by ilyas aaddar",
        howToPlay: "How to Play Tic Tac Toe Online",
        htpH1: "Enter your desired player name.",
        htpH2: "To start a new game, click 'Create New Game'. A unique 5-character game code will be generated. Share this code with your friend.",
        htpH3: "To join an existing game, click 'Join Game', enter the game code provided by your friend, and click 'Submit'.",
        htpH4: "Once both players are in, the game will start. Players take turns clicking on the empty squares.",
        htpH5: "The first player to get three of their marks in a row (horizontally, vertically, or diagonally) wins!",
        htpH6: "The scoreboard tracks your wins, losses, and draws.",
        htpH7: "After a match, you can choose to restart the game to play another round.",
        htpH8: "If a player leaves, the game will be abandoned for the other player.",
        gotIt: "Got It!",
        errorSigningIn: "Error signing in. Please try again.",
        errorSyncingGame: "Error syncing game state.",
        gameNotFound: "Game not found or has ended.",
        chat: "Chat",
        typeMessage: "Type your message...",
        send: "Send",
        hideChat: "Hide Chat",
        showChat: "Show Chat",
        noMessages: "No messages yet."
    },
    ar: {
        title: "إكس أو",
        loadingUser: "جاري تحميل المستخدم...",
        welcome: "مرحبًا بك!",
        enterYourName: "أدخل اسمك",
        createNewGame: "إنشاء لعبة جديدة",
        joinGame: "الانضمام إلى لعبة",
        submit: "تأكيد",
        cancel: "إلغاء",
        gameCode: "رمز اللعبة:",
        waitingForOpponent: "بانتظار انضمام الخصم...",
        itsTurn: "إنه دور {playerName} ({symbol})",
        wins: "{playerName} ({symbol}) يفوز!",
        draw: "إنها تعادل!",
        restartGame: "إعادة تشغيل اللعبة",
        scoreboard: "لوحة النتائج",
        winsShort: "فوز",
        lossesShort: "خسارة",
        drawsShort: "تعادل",
        you: "(أنت)",
        opponent: "(الخصم)",
        player1: "اللاعب 1",
        player2: "اللاعب 2",
        pleaseEnterName: "الرجاء إدخال اسمك أولاً.",
        pleaseWaitSignIn: "الرجاء الانتظار، جاري تسجيل الدخول...",
        failedToCreateGame: "فشل إنشاء اللعبة. يرجى المحاولة مرة أخرى.",
        gameCreated: "تم إنشاء اللعبة! شارك هذا الرمز مع صديقك: {code}",
        enterGameCode: "أدخل رمز اللعبة",
        noGameFound: "لم يتم العثور على لعبة في انتظارك بهذا الرمز، أو أن اللعبة ممتلئة/بدأت. يرجى تجربة رمز آخر.",
        alreadyInGame: "أنت بالفعل في هذه اللعبة. جاري الاستئناف...",
        gameFull: "هذه اللعبة ممتلئة بالفعل.",
        joinedGame: "انضممت إلى اللعبة {code}! اللعبة تبدأ...",
        failedToJoinGame: "فشل الانضمام إلى اللعبة. يرجى التحقق من الرمز والمحاولة مرة أخرى.",
        notYourTurn: "ليس دورك!",
        errorMakingMove: "خطأ في تنفيذ الحركة. يرجى المحاولة مرة أخرى.",
        gameRestarted: "تمت إعادة تشغيل اللعبة! دور X.",
        failedToRestartGame: "فشل في إعادة تشغيل اللعبة.",
        leaveGame: "مغادرة اللعبة",
        gameDeleted: "تم حذف اللعبة حيث لم يتبق سوى لاعب واحد.",
        youHaveLeftGame: "لقد غادرت اللعبة.",
        failedToLeaveGame: "فشل في مغادرة اللعبة.",
        designedBy: "تصميم: إلياس عدّار",
        howToPlay: "كيف تلعب إكس أو عبر الإنترنت",
        htpH1: "أدخل اسم اللاعب الذي تريده.",
        htpH2: "لبدء لعبة جديدة، انقر على 'إنشاء لعبة جديدة'. سيتم إنشاء رمز لعبة فريد مكون من 5 أحرف. شارك هذا الرمز مع صديقك.",
        htpH3: "للانضمام إلى لعبة موجودة، انقر على 'الانضمام إلى لعبة'، وأدخل رمز اللعبة الذي قدمه لك صديقك، ثم انقر على 'تأكيد'.",
        htpH4: "بمجرد دخول كلا اللاعبين، ستبدأ اللعبة. يتناوب اللاعبون على النقر على المربعات الفارغة.",
        htpH5: "أول لاعب يحصل على ثلاث علامات متتالية (أفقياً أو عمودياً أو قطرياً) يفوز!",
        htpH6: "تتبع لوحة النتائج انتصاراتك وخسائرك وتعادلاتك.",
        htpH7: "بعد المباراة، يمكنك اختيار إعادة تشغيل اللعبة للعب جولة أخرى.",
        htpH8: "إذا غادر لاعب، فسيتم التخلي عن اللعبة للاعب الآخر.",
        gotIt: "فهمت!",
        errorSigningIn: "خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.",
        errorSyncingGame: "خطأ في مزامنة حالة اللعبة.",
        gameNotFound: "لم يتم العثور على اللعبة أو انتهت.",
        chat: "الدردشة",
        typeMessage: "اكتب رسالتك...",
        send: "إرسال",
        hideChat: "إخفاء الدردشة",
        showChat: "إظهار الدردشة",
        noMessages: "لا توجد رسائل بعد."
    }
};

function App() {
    const [user, setUser] = useState(null); // Firebase user object
    const [userId, setUserId] = useState(null); // Custom user ID (Firebase UID or anonymous)
    const [userName, setUserName] = useState(''); // Player's chosen display name
    const [gameCode, setGameCode] = useState(''); // Game code entered by user
    const [currentGame, setCurrentGame] = useState(null); // Current game data from Firestore
    const [message, setMessage] = useState(''); // Messages displayed to the user
    const [isJoining, setIsJoining] = useState(false); // State to toggle join game input
    const [showGameCodeInput, setShowGameCodeInput] = useState(false); // State to show/hide game code input
    const [showScoreboard, setShowScoreboard] = useState(false); // State to show/hide scoreboard
    const [showHelpModal, setShowHelpModal] = useState(false); // State to show/hide help modal
    const [language, setLanguage] = useState(localStorage.getItem('tic-tac-toe-lang') || 'en'); // Language state
    const t = translations[language]; // Current translation object
    const unsubscribeRef = useRef(null); // Ref to store the Firestore unsubscribe function
    const unsubscribeChatRef = useRef(null); // Ref for chat unsubscribe
    const [showChat, setShowChat] = useState(false); // State to toggle chat visibility
    const [chatInput, setChatInput] = useState(''); // State for chat input field
    const [chatMessages, setChatMessages] = useState([]); // State for chat messages
    const chatMessagesEndRef = useRef(null); // Ref for auto-scrolling chat

    // Function to generate a random 5-character alphanumeric game code
    const generateGameCode = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    };

    // Firebase authentication and user setup
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setUserId(currentUser.uid);
                // Try to load user name from local storage or Firestore profile if available
                const storedName = localStorage.getItem(`tic-tac-toe-userName-${currentUser.uid}`);
                if (storedName) {
                    setUserName(storedName);
                }
            } else {
                // If no user, sign in anonymously (initialAuthToken is null now)
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Error signing in:", error);
                    setMessage(t.errorSigningIn);
                }
            }
        });

        // Cleanup on unmount
        return () => {
            unsubscribeAuth();
            if (unsubscribeRef.current) {
                unsubscribeRef.current(); // Unsubscribe from Firestore game updates
            }
            if (unsubscribeChatRef.current) {
                unsubscribeChatRef.current(); // Unsubscribe from Firestore chat updates
            }
        };
    }, [t.errorSigningIn]); // Depend on translation for error message

    // Effect to listen for game changes when a game is joined or created
    useEffect(() => {
        if (currentGame?.id && userId) {
            const gameDocRef = doc(db, `artifacts/${appId}/public/data/games`, currentGame.id);

            // Unsubscribe from any previous listener
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }

            // Set up new listener for game state
            unsubscribeRef.current = onSnapshot(gameDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCurrentGame({ id: docSnap.id, ...data });
                    console.log("Game state updated:", data);
                    // Update scoreboard visibility
                    setShowScoreboard(true);
                } else {
                    setCurrentGame(null);
                    setMessage(t.gameNotFound);
                    setShowScoreboard(false);
                }
            }, (error) => {
                console.error("Error listening to game updates:", error);
                setMessage(t.errorSyncingGame);
            });
        } else {
            // No current game, ensure no listener is active
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            // Also clear chat messages and unsubscribe from chat when no game is active
            setChatMessages([]);
            if (unsubscribeChatRef.current) {
                unsubscribeChatRef.current();
                unsubscribeChatRef.current = null;
            }
        }
    }, [currentGame?.id, userId, t.gameNotFound, t.errorSyncingGame]); // Depend on translations

    // Effect to listen for chat messages
    useEffect(() => {
        if (currentGame?.id) {
            const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/games/${currentGame.id}/messages`);
            // For production, consider adding orderBy("timestamp") and creating an index in Firestore console.
            // Example: const q = query(messagesCollectionRef, orderBy("timestamp"));
            const q = query(messagesCollectionRef);

            // Unsubscribe from any previous chat listener
            if (unsubscribeChatRef.current) {
                unsubscribeChatRef.current();
            }

            unsubscribeChatRef.current = onSnapshot(q, (snapshot) => {
                const messages = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // Sort by timestamp
                setChatMessages(messages);
            }, (error) => {
                console.error("Error listening to chat messages:", error);
            });
        }
        // Cleanup chat listener when game changes or component unmounts
        return () => {
            if (unsubscribeChatRef.current) {
                unsubscribeChatRef.current();
                unsubscribeChatRef.current = null;
            }
        };
    }, [currentGame?.id]);

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (chatMessagesEndRef.current) {
            chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatMessages]);


    // Handlers for game actions

    const handleCreateGame = async () => {
        if (!userName.trim()) {
            setMessage(t.pleaseEnterName);
            return;
        }
        if (!userId) {
            setMessage(t.pleaseWaitSignIn);
            return;
        }

        const newGameCode = generateGameCode();
        const initialGameData = {
            gameCode: newGameCode,
            players: {
                [userId]: { name: userName, wins: 0, losses: 0, draws: 0 }
            },
            board: Array(9).fill(null),
            currentPlayer: 'X', // X always starts
            status: 'waiting', // Waiting for second player
            winner: null,
            draw: false,
            playerXId: userId,
            playerOId: null, // Will be set when second player joins
            gameTurn: 0, // To track turns and prevent race conditions
            createdAt: Date.now(),
        };

        try {
            // Add a new document to the 'games' collection
            const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/games`), initialGameData);
            setCurrentGame({ id: docRef.id, ...initialGameData });
            setGameCode(newGameCode); // Display the generated game code
            setMessage(t.gameCreated.replace('{code}', newGameCode));
            localStorage.setItem(`tic-tac-toe-userName-${userId}`, userName); // Store name
        } catch (e) {
            console.error("Error creating game:", e);
            setMessage(t.failedToCreateGame);
        }
    };

    const handleJoinGame = async () => {
        if (!userName.trim()) {
            setMessage(t.pleaseEnterName);
            return;
        }
        if (!gameCode.trim()) {
            setMessage(t.enterGameCode);
            return;
        }
        if (!userId) {
            setMessage(t.pleaseWaitSignIn);
            return;
        }

        try {
            const gamesRef = collection(db, `artifacts/${appId}/public/data/games`);
            // Query for games with the entered game code and status 'waiting'
            const q = query(gamesRef, where("gameCode", "==", gameCode.trim().toUpperCase()), where("status", "==", "waiting"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setMessage(t.noGameFound);
                return;
            }

            const gameDoc = querySnapshot.docs[0]; // Get the first matching game
            const gameData = gameDoc.data();

            // Check if player is already in this game or if the game is full
            if (gameData.players[userId]) {
                setMessage(t.alreadyInGame);
                setCurrentGame({ id: gameDoc.id, ...gameData });
                localStorage.setItem(`tic-tac-toe-userName-${userId}`, userName); // Store name
                return;
            }

            if (Object.keys(gameData.players).length >= 2) {
                setMessage(t.gameFull);
                return;
            }

            // Update the game document to add the second player
            const updatedPlayers = {
                ...gameData.players,
                [userId]: { name: userName, wins: 0, losses: 0, draws: 0 }
            };

            await updateDoc(doc(db, `artifacts/${appId}/public/data/games`, gameDoc.id), {
                players: updatedPlayers,
                status: 'playing', // Game can now start
                playerOId: userId, // Assign this player as O
            });

            setCurrentGame({ id: gameDoc.id, ...gameData, players: updatedPlayers, status: 'playing', playerOId: userId });
            setMessage(t.joinedGame.replace('{code}', gameCode.trim().toUpperCase()));
            localStorage.setItem(`tic-tac-toe-userName-${userId}`, userName); // Store name
            setIsJoining(false); // Hide join input
        } catch (e) {
            console.error("Error joining game:", e);
            setMessage(t.failedToJoinGame);
        }
    };

    const handleCellClick = async (index) => {
        if (!currentGame || currentGame.status !== 'playing' || currentGame.board[index] !== null || currentGame.winner || currentGame.draw) {
            return; // Cannot click if game not playing, cell occupied, or game ended
        }

        // Determine if it's the current user's turn
        const isPlayerX = userId === currentGame.playerXId;
        const isPlayerO = userId === currentGame.playerOId;
        const isMyTurn = (currentGame.currentPlayer === 'X' && isPlayerX) || (currentGame.currentPlayer === 'O' && isPlayerO);

        if (!isMyTurn) {
            setMessage(t.notYourTurn);
            return;
        }

        const newBoard = [...currentGame.board];
        newBoard[index] = currentGame.currentPlayer;

        const nextPlayer = currentGame.currentPlayer === 'X' ? 'O' : 'X';
        const winner = calculateWinner(newBoard);
        const isDraw = !winner && newBoard.every(cell => cell !== null);

        let newStatus = 'playing';
        let newWinner = null;
        let newDraw = false;
        let updatedPlayerStats = { ...currentGame.players };
        let currentMessage = '';

        if (winner) {
            newStatus = 'finished';
            newWinner = winner;
            // Update scores for the winner and loser
            const winnerId = (winner === 'X' ? currentGame.playerXId : currentGame.playerOId);
            const loserId = (winner === 'X' ? currentGame.playerOId : currentGame.playerXId);

            if (updatedPlayerStats[winnerId]) {
                updatedPlayerStats[winnerId].wins = (updatedPlayerStats[winnerId].wins || 0) + 1;
            }
            if (updatedPlayerStats[loserId]) {
                updatedPlayerStats[loserId].losses = (updatedPlayerStats[loserId].losses || 0) + 1;
            }
            winSound.triggerAttackRelease('C5', '8n'); // Play win sound
            currentMessage = t.wins.replace('{playerName}', updatedPlayerStats[winnerId]?.name || winner).replace('{symbol}', winner);
        } else if (isDraw) {
            newStatus = 'finished';
            newDraw = true;
            // Update draws for both players
            if (updatedPlayerStats[currentGame.playerXId]) {
                updatedPlayerStats[currentGame.playerXId].draws = (updatedPlayerStats[currentGame.playerXId].draws || 0) + 1;
            }
            if (updatedPlayerStats[currentGame.playerOId]) {
                updatedPlayerStats[currentGame.playerOId].draws = (updatedPlayerStats[currentGame.playerOId].draws || 0) + 1;
            }
            drawSound.triggerAttackRelease('D4', '8n'); // Play draw sound
            currentMessage = t.draw;
        } else {
            moveSound.triggerAttackRelease('C4', '8n'); // Play move sound
            const nextPlayerName = currentGame.players[nextPlayer === 'X' ? currentGame.playerXId : currentGame.playerOId]?.name;
            currentMessage = t.itsTurn.replace('{playerName}', nextPlayerName).replace('{symbol}', nextPlayer);
        }
        setMessage(currentMessage);

        try {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/games`, currentGame.id), {
                board: newBoard,
                currentPlayer: nextPlayer,
                status: newStatus,
                winner: newWinner,
                draw: newDraw,
                players: updatedPlayerStats,
                gameTurn: currentGame.gameTurn + 1, // Increment turn counter
            });
        } catch (e) {
            console.error("Error updating game state:", e);
            setMessage(t.errorMakingMove);
        }
    };

    const handleRestartGame = async () => {
        if (!currentGame) return;

        // Reset game state, but keep player data and scores
        const newGameData = {
            board: Array(9).fill(null),
            currentPlayer: 'X',
            status: 'playing', // Immediately set to playing for a new round
            winner: null,
            draw: false,
            gameTurn: 0,
        };

        try {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/games`, currentGame.id), newGameData);
            setMessage(t.gameRestarted);
        } catch (e) {
            console.error("Error restarting game:", e);
            setMessage(t.failedToRestartGame);
        }
    };

    const handleLeaveGame = async () => {
        if (!currentGame || !userId) return;

        try {
            const gameDocRef = doc(db, `artifacts/${appId}/public/data/games`, currentGame.id);
            const gameSnap = await getDoc(gameDocRef);

            if (gameSnap.exists()) {
                const gameData = gameSnap.data();
                const players = Object.keys(gameData.players);

                // If only one player is left, delete the game
                if (players.length <= 1) {
                    await deleteDoc(gameDocRef);
                    setMessage(t.gameDeleted);
                } else {
                    // If multiple players, remove this player's data
                    const updatedPlayers = { ...gameData.players };
                    delete updatedPlayers[userId];

                    // If the leaving player was X or O, update those IDs
                    let newPlayerXId = gameData.playerXId;
                    let newPlayerOId = gameData.playerOId;

                    if (newPlayerXId === userId) {
                        newPlayerXId = null;
                    }
                    if (newPlayerOId === userId) {
                        newPlayerOId = null;
                    }

                    await updateDoc(gameDocRef, {
                        players: updatedPlayers,
                        playerXId: newPlayerXId,
                        playerOId: newPlayerOId,
                        // Optionally set status to 'waiting' if only one player left now
                        status: Object.keys(updatedPlayers).length === 1 ? 'waiting' : gameData.status,
                        winner: Object.keys(updatedPlayers).length === 1 ? 'game_abandoned' : gameData.winner, // Mark as abandoned if one player leaves
                        draw: Object.keys(updatedPlayers).length === 1 ? false : gameData.draw,
                    });
                    setMessage(t.youHaveLeftGame);
                }
            }
            setCurrentGame(null);
            setGameCode('');
            setShowGameCodeInput(false);
            setIsJoining(false);
            setShowScoreboard(false);
            setChatMessages([]); // Clear chat messages
            // Also unsubscribe from the Firestore listener
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            if (unsubscribeChatRef.current) {
                unsubscribeChatRef.current();
                unsubscribeChatRef.current = null;
            }
        } catch (e) {
            console.error("Error leaving game:", e);
            setMessage(t.failedToLeaveGame);
        }
    };


    // Helper function to calculate winner
    const calculateWinner = (board) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6], // Diagonals
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a]; // Returns 'X' or 'O'
            }
        }
        return null; // No winner
    };

    // Render a single square
    const Square = ({ value, onClick }) => (
        <button
            className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gray-800 text-6xl sm:text-7xl md:text-8xl font-bold rounded-xl flex items-center justify-center
                       shadow-lg hover:scale-105 transition-transform duration-200 ease-in-out
                       disabled:opacity-50 disabled:cursor-not-allowed
                       "
            onClick={onClick}
            disabled={value !== null || !currentGame || currentGame.status !== 'playing' || currentGame.winner || currentGame.draw}
        >
            <span className={value === 'X' ? 'text-blue-400' : 'text-red-400'}>
                {value}
            </span>
        </button>
    );

    // Render the game board
    const Board = ({ board, onClick }) => (
        <div className="grid grid-cols-3 gap-3 p-4 bg-gray-900 rounded-2xl shadow-2xl scale-90 sm:scale-100">
            {board.map((cell, i) => (
                <Square key={i} value={cell} onClick={() => onClick(i)} />
            ))}
        </div>
    );

    // Get player names
    const getPlayerName = (playerId, fallback = t.player1) => { // Use t.player1 as default
        return currentGame?.players?.[playerId]?.name || fallback;
    };

    // Determine current player's symbol (X or O)
    const mySymbol = userId === currentGame?.playerXId ? 'X' : (userId === currentGame?.playerOId ? 'O' : null);
    const opponentSymbol = mySymbol === 'X' ? 'O' : (mySymbol === 'O' ? 'X' : null);

    // Get opponent's ID
    const opponentId = (mySymbol === 'X' ? currentGame?.playerOId : currentGame?.playerXId);

    // Toggle language handler
    const toggleLanguage = () => {
        const newLang = language === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
        localStorage.setItem('tic-tac-toe-lang', newLang);
    };

    // Set text direction based on language
    const textDirection = language === 'ar' ? 'rtl' : 'ltr';

    // Chat functionality
    const handleSendMessage = async () => {
        if (!chatInput.trim() || !currentGame?.id || !userId || !userName) return;

        try {
            const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/games/${currentGame.id}/messages`);
            await addDoc(messagesCollectionRef, {
                senderId: userId,
                senderName: userName,
                text: chatInput.trim(),
                timestamp: Date.now(),
            });
            setChatInput(''); // Clear input after sending
        } catch (e) {
            console.error("Error sending message:", e);
        }
    };

    const handleEmojiClick = (emoji) => {
        setChatInput(prev => prev + emoji);
    };

    const emojis = ['😊', '😂', '👍', '❤️', '🥳', '🤔', '👋', '🤩']; // Common emojis

    // Render main application content
    return (
        <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-4 font-inter relative ${textDirection === 'rtl' ? 'rtl' : 'ltr'}`}>

            {/* Language Toggle Button */}
            <button
                className="absolute top-4 left-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition-colors duration-200 z-10"
                onClick={toggleLanguage}
            >
                {language === 'en' ? 'العربية' : 'English'}
            </button>

            {/* Help Button */}
            <button
                className="absolute top-4 right-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition-colors duration-200 z-10"
                onClick={() => setShowHelpModal(true)}
            >
                ?
            </button>

            {/* Help Modal */}
            {showHelpModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className={`bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full text-center relative border border-gray-600 ${textDirection === 'rtl' ? 'rtl' : 'ltr'}`}>
                        <button
                            className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl"
                            onClick={() => setShowHelpModal(false)}
                        >
                            &times;
                        </button>
                        <h2 className="text-2xl font-bold mb-4 text-blue-400">{t.howToPlay}</h2>
                        <ul className="text-left text-gray-300 space-y-3 list-disc pl-5 pr-5">
                            <li>{t.htpH1}</li>
                            <li>{t.htpH2}</li>
                            <li>{t.htpH3}</li>
                            <li>{t.htpH4}</li>
                            <li>{t.htpH5}</li>
                            <li>{t.htpH6}</li>
                            <li>{t.htpH7}</li>
                            <li>{t.htpH8}</li>
                        </ul>
                        <button
                            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg shadow-md transition-colors duration-200"
                            onClick={() => setShowHelpModal(false)}
                        >
                            {t.gotIt}
                        </button>
                    </div>
                </div>
            )}

            <h1 className="text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 drop-shadow-lg text-center">
                {t.title}
            </h1>

            {!userId && (
                <div className="loading-spinner text-gray-400 text-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    <p className="mt-2">{t.loadingUser}</p>
                </div>
            )}

            {userId && !currentGame && (
                <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700 w-full max-w-md text-center">
                    <h2 className="text-3xl font-semibold mb-6 text-blue-300">{t.welcome}</h2>
                    <input
                        type="text"
                        className="w-full p-3 mb-4 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t.enterYourName}
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        maxLength="15"
                    />
                    <div className="space-y-4">
                        <button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={handleCreateGame}
                            disabled={!userName.trim()}
                        >
                            {t.createNewGame}
                        </button>
                        <button
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            onClick={() => {
                                setIsJoining(true);
                                setShowGameCodeInput(true);
                                setMessage(''); // Clear previous messages
                            }}
                        >
                            {t.joinGame}
                        </button>
                    </div>
                    {showGameCodeInput && (
                        <div className="mt-6 flex flex-col items-center">
                            <input
                                type="text"
                                className="w-full p-3 mb-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 uppercase text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder={t.enterGameCode}
                                value={gameCode}
                                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                                maxLength="5"
                            />
                            <button
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500"
                                onClick={handleJoinGame}
                                disabled={!gameCode.trim() || !userName.trim()}
                            >
                                {t.submit}
                            </button>
                            <button
                                className="mt-3 text-gray-400 hover:text-white"
                                onClick={() => {
                                    setShowGameCodeInput(false);
                                    setIsJoining(false);
                                    setGameCode('');
                                    setMessage('');
                                }}
                            >
                                {t.cancel}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {currentGame && (
                <div className="flex flex-col items-center justify-center bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-700 max-w-full lg:max-w-xl w-full">
                    <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-blue-300 text-center">
                        {t.gameCode} <span className="font-bold text-yellow-400">{currentGame.gameCode}</span>
                    </h2>

                    <div className="flex justify-around w-full mb-6 text-xl sm:text-2xl font-bold">
                        <div className={`flex flex-col items-center p-2 rounded-lg ${currentGame.currentPlayer === 'X' ? 'bg-blue-900 shadow-lg scale-105 transition-all duration-300' : 'text-gray-400'}`}>
                            <span className="text-blue-400">X</span>
                            <span>{getPlayerName(currentGame.playerXId, t.player1)}</span>
                            <span className="text-sm font-normal text-gray-300">{mySymbol === 'X' ? t.you : (opponentSymbol === 'X' ? t.opponent : '')}</span>
                        </div>
                        <div className={`flex flex-col items-center p-2 rounded-lg ${currentGame.currentPlayer === 'O' ? 'bg-red-900 shadow-lg scale-105 transition-all duration-300' : 'text-gray-400'}`}>
                            <span className="text-red-400">O</span>
                            <span>{getPlayerName(currentGame.playerOId, t.player2)}</span>
                            <span className="text-sm font-normal text-gray-300">{mySymbol === 'O' ? t.you : (opponentSymbol === 'O' ? t.opponent : '')}</span>
                        </div>
                    </div>

                    {currentGame.status === 'waiting' && (
                        <p className="text-yellow-300 text-lg mb-6 animate-pulse">{t.waitingForOpponent}</p>
                    )}

                    <Board board={currentGame.board} onClick={handleCellClick} />

                    <div className="mt-6 text-xl text-center">
                        {currentGame.status === 'playing' && (
                            <p className="text-lg text-gray-300">
                                {t.itsTurn
                                    .replace('{playerName}', getPlayerName(currentGame.currentPlayer === 'X' ? currentGame.playerXId : currentGame.playerOId))
                                    .replace('{symbol}', currentGame.currentPlayer)}
                            </p>
                        )}
                        {(currentGame.winner || currentGame.draw) && (
                            <div className="flex flex-col items-center">
                                <p className="text-3xl font-extrabold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-lime-500 animate-bounce">
                                    {currentGame.winner ? t.wins.replace('{playerName}', getPlayerName(currentGame.winner === 'X' ? currentGame.playerXId : currentGame.playerOId)).replace('{symbol}', currentGame.winner) : t.draw}
                                </p>
                                <button
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    onClick={handleRestartGame}
                                >
                                    {t.restartGame}
                                </button>
                            </div>
                        )}
                    </div>

                    {showScoreboard && (
                        <div className="mt-8 p-4 bg-gray-900 rounded-lg shadow-inner w-full">
                            <h3 className="text-2xl font-bold mb-4 text-center text-green-400">{t.scoreboard}</h3>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                {Object.keys(currentGame.players).map(pId => (
                                    <div key={pId} className="p-3 bg-gray-700 rounded-lg shadow-md border border-gray-600">
                                        <p className="font-semibold text-lg text-gray-200 mb-1">{currentGame.players[pId].name} {pId === userId ? t.you : (pId === opponentId ? t.opponent : '')}</p>
                                        <p className="text-sm text-green-300">{t.winsShort}: {currentGame.players[pId].wins || 0}</p>
                                        <p className="text-sm text-red-300">{t.lossesShort}: {currentGame.players[pId].losses || 0}</p>
                                        <p className="text-sm text-yellow-300">{t.drawsShort}: {currentGame.players[pId].draws || 0}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500"
                        onClick={handleLeaveGame}
                    >
                        {t.leaveGame}
                    </button>

                    {/* Chat Toggle Button */}
                    <button
                        className="mt-6 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition-colors duration-200"
                        onClick={() => setShowChat(!showChat)}
                    >
                        {showChat ? t.hideChat : t.showChat}
                    </button>

                    {/* Chat Window */}
                    {showChat && (
                        <div className="mt-6 w-full max-w-md bg-gray-900 rounded-xl shadow-lg border border-gray-700 flex flex-col h-72">
                            <div className="p-3 text-lg font-bold text-blue-300 border-b border-gray-700 text-center">{t.chat}</div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                {chatMessages.length === 0 ? (
                                    <p className="text-gray-400 text-center mt-4">{t.noMessages}</p>
                                ) : (
                                    chatMessages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`p-2 rounded-lg max-w-[80%] ${msg.senderId === userId ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'}`}>
                                                <span className="font-semibold text-sm block mb-1">
                                                    {msg.senderId === userId ? t.you : msg.senderName}
                                                </span>
                                                <p className="text-base break-words">{msg.text}</p>
                                                <span className="text-xs text-gray-300 block text-right mt-1">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={chatMessagesEndRef} /> {/* For auto-scrolling */}
                            </div>
                            <div className="border-t border-gray-700 p-3 flex flex-col space-y-2">
                                <div className="flex space-x-2 justify-center">
                                    {emojis.map(emoji => (
                                        <button
                                            key={emoji}
                                            className="text-2xl p-1 hover:bg-gray-700 rounded-full transition-colors duration-200"
                                            onClick={() => handleEmojiClick(emoji)}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex">
                                    <input
                                        type="text"
                                        className="flex-1 p-2 rounded-l-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder={t.typeMessage}
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                                    />
                                    <button
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-lg shadow-md transition-colors duration-200"
                                        onClick={handleSendMessage}
                                        disabled={!chatInput.trim()}
                                    >
                                        {t.send}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {message && (
                <div className="mt-6 p-4 bg-blue-900 bg-opacity-70 rounded-lg shadow-lg text-blue-200 text-center max-w-md w-full">
                    {message}
                </div>
            )}

            <footer className="mt-10 text-gray-500 text-sm italic">
                {t.designedBy}
            </footer>
        </div>
    );
}

export default App;
