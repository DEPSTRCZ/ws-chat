import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";


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

//specify cors to allow all

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "www"));

app.get("/chat", (req, res) => {
    const params = req.query;

    const token = params.token as string;

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


    //const user = users.find((user) => user.token === token);

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

    res.redirect(`/chat?token=${token}`);
});


interface AuthenticatedSocket extends Socket {
    user?: any;
}

io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.query.token as string; // JWT passed in query during connection

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
      // You can emit a response back to the client here

      data.userName += user.name;
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