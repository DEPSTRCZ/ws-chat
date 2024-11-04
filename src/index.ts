import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";

const app = express();
const port = 3000;

const httpServer = http.createServer(app);
const io = new Server(httpServer);

let messageStore = [];

app.set("view engine", "ejs");
app.set("src/www", path.join(__dirname, "www"));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/new", (req, res) => {
    res.send("New message");
});


io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

io.on("message", (message) => {
    console.log("Message received: " + message);
    messageStore.push(message);
    io.emit("message", messageStore);
});

httpServer.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});