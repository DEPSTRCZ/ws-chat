import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";

const app = express();
const port = 3000;

const httpServer = http.createServer(app);
const io = new Server(httpServer);

let messages = new Array();


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "www"));

app.get("/", (req, res) => {
    res.render('index', {messages: messages});
});


io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

io.on('connection', (socket) => {
    socket.on('clientEvent', (data) => {
      console.log('Received data:', data);
      // You can emit a response back to the client here
      messages.push(data);
      console.log(messages)
      socket.emit('responseEvent', 'Server received your message!');
    });
});

httpServer.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});