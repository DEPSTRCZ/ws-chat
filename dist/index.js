"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const body_parser_1 = __importDefault(require("body-parser"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app = (0, express_1.default)();
const port = 3000;
// by mělo bejt v .env ale co už
const JWT_SECRET = "secretASKOHDIZIOASDGZIGUI7654465654654asdasd__-asdasd%";
const httpServer = http_1.default.createServer(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
let messages = new Array();
let users = new Array();
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
app.use((0, cookie_parser_1.default)());
//specify cors to allow all
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});
app.use(express_1.default.static(path_1.default.join(__dirname, 'static')));
app.get("/chat", (req, res) => {
    // Check if user cookie token is present
    const token = req.cookies.token.split("Bearer ")[1];
    if (!token) {
        res.status(400).send("Bad Request");
        return;
    }
    // Verify the token
    try {
        jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (e) {
        res.status(401).send("Unauthorized");
        return;
    }
    //const user = users.find((user) => user.token === token);
    res.sendFile(path_1.default.join(__dirname, 'www/html/chat.html'));
});
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'www/html/main.html'));
});
app.post("/refresh", (req, res) => {
    // Check if user cookie token is present
    const token = req.cookies.token.split("Bearer ")[1];
    if (!token) {
        res.status(400).send("Bad Request");
        return;
    }
    // Verify the token
    try {
        const isOk = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!isOk) {
            res.status(401).send("Not Needed");
            return;
        }
    }
    catch (e) {
        // Check if the token was expired
        if (e instanceof Error && e.name === "TokenExpiredError") {
            const user = jsonwebtoken_1.default.decode(token);
            if (!user) {
                res.status(401).send("Unauthorized");
                return;
            }
            const newToken = jsonwebtoken_1.default.sign({ uuid: user.uuid, name: user.name }, JWT_SECRET, { expiresIn: '1h' });
            res.cookie("token", "Bearer " + newToken);
            res.status(200).send("Token Refreshed");
            return;
        }
        res.status(401).send("Unauthorized");
        return;
    }
});
;
app.post("/init", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const name = req.body.user;
    if (!name) {
        res.status(400).send("Bad Request");
        return;
    }
    //Generate a random userid
    const userUUID = (0, crypto_1.randomUUID)();
    const token = jsonwebtoken_1.default.sign({ id: userUUID, name: name }, JWT_SECRET, { expiresIn: '1h' });
    // Create a new user object
    const user = {
        name: name,
        uuid: userUUID,
    };
    users.push(user);
    // Set the token to cookie and redirect to chat
    res.cookie("token", "Bearer " + token);
    res.redirect(`/chat`);
}));
io.use((socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    const token = socket.handshake.auth.token.split("Bearer ")[1]; // JWT passed in cookies during connection
    if (!token) {
        return next(new Error("Authentication error: Token missing"));
    }
    // Verify the token and attach user info to the socket
    try {
        const user = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!user) {
            return next(new Error("Authentication error: Invalid token"));
        }
        socket["user"] = user;
        next();
    }
    catch (e) {
        return next(new Error("Authentication error: " + e));
    }
}));
io.on('connection', (socket) => {
    const user = socket.user;
    // If user is not authenticated, disconnect
    if (!user) {
        socket.disconnect();
        return;
    }
    socket.on('message', (data) => {
        console.log('Received data:', data);
        data.userName = user.name;
        messages.push(data);
        io.emit('serverMessage', data);
    });
    socket.on('getPast', () => {
        io.emit('serverReturn', messages);
        console.log("reqest for older messages");
    });
});
httpServer.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
