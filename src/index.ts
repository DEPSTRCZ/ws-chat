import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import cookieParser from "cookie-parser";


const app = express();
const port = 3000;

// by mělo bejt v .env ale co už
const JWT_SECRET = "secretASKOHDIZIOASDGZIGUI7654465654654asdasd__-asdasd%";

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

let messages = new Array();
let users = new Array();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

//specify cors to allow all

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "www"));
app.use(express.static(path.join(__dirname, 'static')));

app.get("/chat", (req, res) => {

    // Check if user cookie token is present
    const token = req.cookies.token.split("Bearer ")[1] as string;

    if (!token) {
        res.status(400).send("Bad Request");
        return;
    }

    // Verify the token
    try {
        jwt.verify(token, JWT_SECRET);
    } catch (e) {
        res.status(401).send("Unauthorized");
        return;
    }

    res.render('chat');
});

app.get("/", (req, res) => {
    res.render('main');
});

app.post("/init", async (req, res) => {
    const name = req.body.user;

    if (!name) {
        res.status(400).send("Bad Request");
        return;
    }

    //Generate a random userid
    const userId = randomUUID();

    const token = jwt.sign({ id: userId, name: name }, JWT_SECRET, { expiresIn: '1h' });

    // Create a new user object
    const user = {
        id: userId,
        name: name,
        uuid: userId,
    };

    users.push(user);

    // Set the token to cookie and redirect to chat
    res.cookie("token","Bearer "+token);
    res.redirect(`/chat`);
});


interface AuthenticatedSocket extends Socket {
    user?: any;
}

io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token.split("Bearer ")[1] as string; // JWT passed in cookies during connection

    if (!token) {
        return next(new Error("Authentication error: Token missing"));
    }

    // Verify the token and attach user info to the socket
    try {
        const user = jwt.verify(token, JWT_SECRET);

        if (!user) {
            return next(new Error("Authentication error: Invalid token"));
        }
        socket["user"] = user;

        next();
    } catch (e) {
        return next(new Error("Authentication error: "+e));
    }


});


io.on('connection', (socket:AuthenticatedSocket) => {
    const user = socket.user;
    socket.on('message', (data) => {
        console.log('Received data:', data);

        data.userName = user.name;
        messages.push(data);
        io.emit('serverMessage', data);
    });
    socket.on('getPast', () => {
        io.emit('serverReturn', messages);
        console.log("reqest for older messages")
    });
});


httpServer.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});