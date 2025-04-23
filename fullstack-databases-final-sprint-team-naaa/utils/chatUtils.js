const ChatMessage = require('../models/ChatMessage');
let connectedUsers = [];

const WS_EVENTS = Object.freeze({
    JOIN: "JOIN",
    LEAVE: "LEAVE",
    MESSAGE: "MESSAGE",
    USERS: "USERS"
});

// JSON ⇄ {type,payload}
function serialize(type, payload = {}) {
    return JSON.stringify({ type, payload });
}

// {type,payload} ⇄ JSON
function parse(raw) {
    try {
        const obj = JSON.parse(raw);
        return (obj && obj.type && obj.payload !== undefined) ? obj : null;
    } catch {
        return null;
    }
}

// Broadcast helper
function makeBroadcaster(sockets) {
    return (data) => {
        sockets.forEach(s => s.readyState === 1 && s.send(data));
    };
}

/**
 * New client has connected.  
 * Only pushes socket + broadcasts a JOIN (no history).
 */
async function onNewClientConnected(socket, sockets, user) {
    sockets.push(socket);

    if (!connectedUsers.includes(user.username)) {
        connectedUsers.push(user.username);
    }

    const broadcast = makeBroadcaster(sockets);

    broadcast(
        serialize(WS_EVENTS.JOIN, { username: user.username })
    );

    // Send current user list to just the new user //
    broadcast(
        serialize('USERS', { users: connectedUsers })
    );
}


/**
 * Client has disconnected.  
 * Removes from array + broadcasts a LEAVE.
 */
function onClientDisconnected(socket, sockets, user) {

    const idx = sockets.indexOf(socket);
    if (idx !== -1) sockets.splice(idx, 1);

    // Remove from connectedUsers array
    const userIdx = connectedUsers.indexOf(user.username);
    if (userIdx !== -1) connectedUsers.splice(userIdx, 1);

    const broadcast = makeBroadcaster(sockets);

    // Send leave notification //
    broadcast(
        serialize(WS_EVENTS.LEAVE, { username: user.username })
    );

    // Send updated user list to everyone //
    broadcast(
        serialize('USERS', { users: connectedUsers })
    );
}

/**
 * A new chat message arrived.  
 * Saves it, then broadcasts MESSAGE with username, timestamp, text.
 */
async function onNewMessage(msgPayload, user, sockets) {
    const { message } = msgPayload;

    // Save to Mongo
    const saved = await ChatMessage.create({
        userId: user._id,
        message
    });

    // Broadcast to everyone
    const broadcast = makeBroadcaster(sockets);
    broadcast(
        serialize(WS_EVENTS.MESSAGE, {
            username: user.username,
            message: saved.message,
            timestamp: saved.createdAt
        })
    );
}

module.exports = {
    WS_EVENTS,
    serialize,
    parse,
    makeBroadcaster,
    onNewClientConnected,
    onClientDisconnected,
    onNewMessage
};