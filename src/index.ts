import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const port = 3000;

const httpServer = http.createServer(app);
const io = new Server(httpServer);

app.get("/", (req, res) => {
  res.send("Hello World!");
});


io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

httpServer.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});