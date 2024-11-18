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
    const renewThreshold = 600 
    //console.log(exp - new Date().getTime()/1000, renewThreshold);

    if (exp - new Date().getTime()/1000 <= renewThreshold) {

        try {
            // Renew the token
            console.log("Renewing token...");
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

function sendClientSytemMessage(message,type) {
    let messageDiv = document.createElement("div");
    messageDiv.classList = "message"+((type == "error") ? " error" : " info");
    messageDiv.id = "system";

    let timestamp = document.createElement("p");
    timestamp.classList = "time";
    messageTime = new Date();
    timestamp.innerText = messageTime.getMonth() + "." 
        + messageTime.getDate() + " " 
        + formatTime(messageTime.getHours()) + ":" 
        + formatTime(messageTime.getMinutes()) + ":" 
        + formatTime(messageTime.getSeconds());

    let user = document.createElement("p");
    user.innerText = "System";
    user.classList = "user";

    let content = document.createElement("h3");
    content.innerText = message;
    user.message = "content";

    let pfp = document.createElement("img");
    pfp.classList = "pfp"
    pfp.src = (type == "error") ? "/img/sign-warning.svg" : "/img/sign-info.svg";

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
}


let chat = document.getElementById("chat")
const token = getCookieByName("token");


// Connect to the server with the JWT token
const socket = io({
    auth: {
        token: token
    }
});
let messages = new Array();

let userName = "";

let typing = new Array();
let typing_to_display = new Array();

let data = {
    time: "",
    content: ""
}


sendClientSytemMessage("Welcome to the chat! Please remember that all messages are user-generated, and we do not take responsibility for any content shared here. Thanks for keeping things respectful!", "info");
getName();
getPast();
updateDisplay();

socket.on('serverMessage', async (msg, callback) => {
    messages.push(msg)
    checkExpiry();
    updateMessages();
});

socket.on('serverReturn', async (msg, callback) => {
    messages = msg;
    updateMessages();

});

socket.on("serverCritical", async (msg, callback) => {
    sendClientSytemMessage(msg, "error");
    setTimeout(() => {
        window.location.href = "/";
    }, 3000);
});

// Optional: Handle connection errors
socket.on("connect_error", (error) => {
    console.error("Socket.IO Connection Error:", error);
    sendClientSytemMessage("Error connecting to the server. Please try again later. \nReason: "+error, "error");
});

// Optional: Define what happens when the connection is disconnected
socket.on("disconnect", () => {
    console.log("Socket.IO connection disconnected");
    // send a message to the user that they have been disconnected with hyperlink to main page
    sendClientSytemMessage("You have been disconnected from the server. Please try to reconnect by refreshing the page or go to main page.", "error");
});

socket.on("typing", (user) => {
    //console.log(user.userName);
    typing.push(user.userName);
    updateDisplay();
    setTimeout(() => {
        typing.pop(user.userName)
        updateDisplay();
    }, 1000);
});

socket.on('name', async (nameGot) => {
    userName = nameGot;
    console.log(userName);
    
});

function updateDisplay() {
    const typing_display = document.getElementById("typing");
    typing_to_display = new Array()
    for (let i = 0;i < typing.length;i++) {
        if (!typing_to_display.includes(typing[i])) {
            typing_to_display.push(typing[i])
        }
    }
    if (typing_to_display.includes(userName)) {
        typing_to_display.pop(userName)
    }
    if (typing_to_display.length == 0) {
        typing_display.style.opacity = "0"
    } else {
        typing_display.style.opacity = "1"
        const typing_text = document.getElementById("typing-user");
        typing_text.innerText = ""
        typing_to_display.forEach(element => {
            if (typing_text.innerText.length == 0) {
                typing_text.innerText += element
            } else {
                typing_text.innerText +=  ", " + element 
            }
        });
    }
}

let content = document.getElementById("content-in");
function send() {
    
    if (content.value.length == 0) {
        return;
    }
    
    data.content = content.value;
    data.time = new Date();
    socket.emit('message', data);
    content.value = "";
}

document.addEventListener('keydown', (event) => {
    //console.log(event.key,event.shiftKey)
    if (event.key == "Enter" && event.shiftKey) {
        return
    } else if (event.key == "Enter") {
        event.preventDefault();
        send();
    }
})


content.addEventListener("input", (event) => {
    // Every 3 characters, send a message to the server that the user is typing
    if (event.target.value.length % 4 == 0) {
        socket.emit('typing');
    }
});

function getPast() {
    socket.emit('getPast')
}

function getName() {
    socket.emit('getName')
}

function formatTime(time) {
    if (String(time).length == 1) {
        return "0" + time;
    } 
    return String(time);
}

function updateMessages() {
    let oldScrollHeight = chat.scrollHeight;
    
    // Not sure why we need to clear the chat first.. Buuut it is not my job to do front end xD
    // Remove all messages expect the ones with id of "system"
    let messagesDivs = document.querySelectorAll(".message");
    for (let message of messagesDivs) {
        if (message.id != "system") {
            message.remove();
        }
    }

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
        content.classList = "content"

        let pfp = document.createElement("img");
        pfp.classList = "pfp"
        pfp.src = "/img/pfp.webp"

        let left = document.createElement("div");
        left.classList = "left";

        let right = document.createElement("div");
        right.classList = "rigth";

        let title = document.createElement("div");
        title.classList = "title";

        if (message.userName == userName) {
            messageDiv.classList += " currentUser";
            timestamp.classList += " currentUser";
            user.classList += " currentUser";
            content.classList += " currentUser";
            title.classList += " currentUser";
        }
        
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