import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";


const app = express();
const port = 3000;

// by mělo bejt v .env ale co už
const JWT_SECRET = "secretASKOHDIZIOASDGZIGUI7654465654654asdasd__-asdasd%";

const httpServer = http.createServer(app);
const io = new Server(httpServer);

let messages = new Array();
let users = new Array();


app.use(bodyParser.urlencoded({ extended: true }));


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "www"));

app.get("/chat", (req, res) => {
    const params = req.query;

    const token = params.token;

    if (!token || !users.find((user) => user.token === token)) {
        res.status(401).send("Bad Request");
        return;
    }

    const user = users.find((user) => user.token === token);

    res.render('chat', {userName: user.name,messages: messages});
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
        token: token
    };

    users.push(user);

    res.redirect(`/chat?token=${token}`);
});


io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

io.on('connection', (socket) => {
    socket.on('message', (data) => {
      console.log('Received data:', data);
      // You can emit a response back to the client here
      messages.push(data);
      console.log(messages)
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