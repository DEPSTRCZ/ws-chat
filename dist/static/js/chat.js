function getCookieByName(name) {
    const cookies = decodeURIComponent(document.cookie).split(";");
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + "=")) {
            return cookie.substring(name.length + 1);
        }
    }
    return null;
}

// https://stackoverflow.com/questions/51292406/check-if-token-expired-using-this-jwt-library + custom
function checkExpiry() {
    const token = getCookieByName("token");
    if (token == null) {
        window.location.href = "/init";
    }

    const { exp } = JSON.parse(atob(token.split(".")[1]));
    
    // CHeck if the token is below the renew threshold or expired

    // THRESHOLD (TO ENV)
    const renewThreshold = 300* 1000; // 5min

    if (exp * 1000 - Date.now() < renewThreshold) {

        try {
            // Renew the token
            const response = fetch("/renew", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include"
            });
            return response.ok ? {"status": "renewed"} : {"status": "error"};
        } catch (error) {
            console.error("Error renewing token:", error);
            return {"status": "error"};
        }
    } else if (exp * 1000 - Date.now() < 0) {
        // Token expired
        return {"status": "expired"};
    } else {
        // Token is still valid
        return {"status": "valid"};
    }


}

const token = getCookieByName("token");
console.log("ss",token);

let enter = false;
let shift = false;

// Connect to the server with the JWT token
const socket = io({
    auth: {
        token: token
    }
});
let messages = new Array();

let data = {
    time: "",
    content: ""
}



getPast();

socket.on('serverMessage', async (msg, callback) => {
    console.log("msg",msg);
    messages.push(msg)
    console.log(messages);
    updateMessages();
});

socket.on('serverReturn', async (msg, callback) => {
    console.log("array",msg);
    messages = msg;
    updateMessages();
});

// Optional: Handle connection errors
socket.on("connect_error", (error) => {
    console.error("Socket.IO Connection Error:", error);
});

// Optional: Define what happens when the connection is disconnected
socket.on("disconnect", () => {
    console.log("Socket.IO connection disconnected");
});

function send() {
    let content = document.getElementById("content-in");
    if (content.value.length == 0) {
        return;
    }
    let date = new Date();
    
    data.content = content.value;
    data.time = new Date();
    socket.emit('message', data);
    content.value = "";
}
/*
document.addEventListener('keydown', (event) => {
    if (event.key == "Enter") {
        enter = true;
    } else if (event.key == "Shift") {
        shift = true;
    }
    if (enter && !shift) {
        send();
    }
})

document.addEventListener('keyup', (event) => {
    if (event.key == "Enter") {
        enter = false;
    } else if (event.key == "Shift") {
        shift = false;
    }
})*/

function getPast() {
    socket.emit('getPast')
}

function formatTime(time) {
    if (String(time).length == 1) {
        return "0" + time;
    } 
    return String(time);
}

function updateMessages() {
    chat = document.getElementById("chat")
    let oldScrollHeight = chat.scrollHeight;
    chat.innerHTML = ""
    messages.forEach((message) => {
        let messageDiv = document.createElement("div");
        messageDiv.classList = "message";

        let timestamp = document.createElement("p");
        timestamp.classList = "time";
        messageTime = new Date(message.time);
        timestamp.innerText = messageTime.getMonth() + "." 
            + messageTime.getDate() + " " 
            + formatTime(messageTime.getHours()) + ":" 
            + formatTime(messageTime.getMinutes()) + ":" 
            + formatTime(messageTime.getSeconds());

        let user = document.createElement("p");
        user.innerText = message.userName;
        user.classList = "user";

        let content = document.createElement("h3");
        content.innerText = message.content;
        user.message = "content";

        let pfp = document.createElement("img");
        pfp.classList = "pfp"
        pfp.src = "/img/pfp.webp"

        let left = document.createElement("div");
        left.classList = "left";

        let right = document.createElement("div");
        right.classList = "rigth";

        let title = document.createElement("div");
        title.classList = "title";
        
        left.appendChild(pfp);
        title.appendChild(user);
        title.appendChild(timestamp);
        right.appendChild(title);
        right.appendChild(content);
        messageDiv.appendChild(left);
        messageDiv.appendChild(right);
        chat.appendChild(messageDiv)
    })
    
    if (chat.scrollTop + chat.offsetHeight == oldScrollHeight) {
        chat.scrollTo(0, chat.scrollHeight);
    }
}