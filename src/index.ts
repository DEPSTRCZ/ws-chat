import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";

const app = express();
const port = 3000;

const httpServer = http.createServer(app);
const io = new Server(httpServer);

app.set("view engine", "ejs");
app.set("src/www", path.join(__dirname, "views"));

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