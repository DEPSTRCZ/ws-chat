import express, { Request, Response } from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import cookieParser from "cookie-parser";
import dotenv from 'dotenv'; 

const app = express();
const port = 3000;
dotenv.config({ path: path.join(__dirname,"../.env") });


const JWT_SECRET = process.env.JWT_TOKEN_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY;
const JWT_EXPIRY_THRESHOLD = process.env.JWT_EXPIRY_THRESHOLD;
const TIME_RESET = process.env.TIME_RESET || null;
if (!JWT_SECRET || !JWT_EXPIRY || !JWT_EXPIRY_THRESHOLD) {
    console.error("Something is wrong in .env file");
    process.exit(1);
}

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


app.use(express.static(path.join(__dirname, 'static')));


// Check if user/session is authenticated and valid
async function isValid(token_string: string) {
    try {
        const token = token_string.split("Bearer ")[1] as string;

        if (!token) return false;

        if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
        
        const user = jwt.verify(token, JWT_SECRET) as User;

        if (!user) return false;

        const now = new Date().getTime() / 1000;

        if (user.exp - now < Number(JWT_EXPIRY_THRESHOLD)) return false;

        if (!users.find((u) => u.uuid === user.uuid)) return false;

        return true;
    } catch (e) {
        return false;
    }
    
};



app.get("/chat", (req, res) => {
    
    // Check if user cookie token is present
    const tokenCookie = req?.cookies?.token;

    if (!tokenCookie) {
        res.status(400).send("To nemuzes :c");
        return;
    }

    const token = tokenCookie.split("Bearer ")[1] as string;


    if (!token) {
        res.status(400).send("Unauthorized");
        return;
    }

    // Verify the token
    try {
        jwt.verify(token, JWT_SECRET);
    } catch (e) {
        res.status(401).send("Unauthorized");
        return;
    }

    res.sendFile(path.join(__dirname, 'www/html/chat.html'));
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'www/html/main.html'));
});

app.post("/renew", (req, res) => {
    // Check if user cookie token is present

    const token = req.cookies.token.split("Bearer ")[1] as string;

    if (!token) {
        res.status(400).send("Bad Request");
        return;
    }

    // Verify the token
    try {
        const isOk = jwt.verify(token, JWT_SECRET) as User;

        if (!isOk) {
            res.status(401).send("Not Needed");
            return;
        }

        // debug print for how long is the token valid
        const now = new Date().getTime() / 1000;
        console.log("Token is valid for " + (isOk.exp - now) + " seconds");

        res.status(200).send("Token is valid");

        // If the token is valid, 
        
    } catch (e) {
        // Check if the token was expired
        if (e instanceof Error && e.name === "TokenExpiredError") {
            const user = jwt.decode(token) as User;

            if (!user) {
                res.status(401).send("Unauthorized");
                return;
            }

            const newToken = jwt.sign({ uuid: user.uuid, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
            res.cookie("token","Bearer "+newToken);
            res.status(200).send("Token Refreshed");
            return;
        }

        // If the token is invalid / expired redirect to main
        res.redirect("/");
        return;
    }

});
;

app.post("/init", async (req, res) => {
    const name = req.body.user;

    if (!name) {
        res.status(400).send("Bad Request");
        return;
    }

    // Check if a user with that name already exists
    const userName = users.find((user) => user.name === name);

    if (userName) {
        res.status(400).send("User already exists");
        return;
    }


    //Generate a random userid
    const userUUID = randomUUID();
    const token = jwt.sign({ id: userUUID, name: name }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    // Create a new user object
    const user = {
        name: name,
        uuid: userUUID,
    };

    users.push(user);

    // Set the token to cookie and redirect to chat
    res.cookie("token","Bearer "+token);
    res.redirect(`/chat`);
});




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
        socket["user"] = user as User;

        next();
    } catch (e) {
        return next(new Error("Authentication error: "+e));
    }


});


io.on('connection', (socket:AuthenticatedSocket) => {
    const user = socket.user;

    socket.use((packet, next) => {
        // Check if the user has a valid token and is not expired
        if (!isValid(socket.handshake.auth.token)) {
            console.log("Invalid token");
            return socket.disconnect();
        }
        next();
    });

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

    socket.on("typing", (data) => {
        console.log("Typing",  { userName: user.name });

        io.emit("typing", { userName: user.name });
    });

    socket.on('getPast', () => {
        io.emit('serverReturn', messages);
        console.log("reqest for older messages")
    });

    socket.on('getName', (id) => {
        socket.emit('name', user.name);
        console.log("reqest for clients name")
    });
});

if (TIME_RESET) {
    // If TIME_RESET is set, emit reset message and reset the messages array
    setInterval(() => {
        io.emit("serverCritical", "Server se resetuje...");
        setTimeout(() => {
            messages = [];
            users = [];
        }, 3000);
    }, Number(TIME_RESET));
}


httpServer.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

interface User {
    uuid: string;
    name: string;
    exp: number;
}
    

interface AuthenticatedSocket extends Socket {
    user?: User;
}