const express = require("express");
const expressWs = require("express-ws");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");
const User = require("./models/User");

const {
  WS_EVENTS,
  parse,
  onNewClientConnected,
  onClientDisconnected,
  onNewMessage,
} = require("./utils/chatUtils");

const PORT = 3000;
const MONGO_URI = "mongodb://localhost:27017/realtime_chat";
const app = express();
expressWs(app);

let connectedClients = [];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(
  session({
    secret: "chat-app-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Middleware to avoid manually passing "user" to partials
app.use(async (request, response, next) => {
  if (request.session.userId) {
    response.locals.currentUser = await User.findById(request.session.userId);

    // If user was deleted but session still exists, destroy the session
    if (!response.locals.currentUser) {
      return request.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
        }
        return response.redirect("/login");
      });
    }
  } else {
    response.locals.currentUser = null;
  }
  next();
});

// Middleware for securing routes
function requireLogin(request, response, next) {
  if (!request.session.userId) {
    return response.redirect("/login");
  }

  next();
}

// Middleware for admin-only routes
async function requireAdmin(request, response, next) {
  const user = await User.findById(request.session.userId);
  if (!user?.isAdmin) return response.status(403).send("Access denied.");
  next();
}

app.get("/", (request, response) => {
  if (response.locals.currentUser) return response.redirect("/dashboard");
  response.render("unauthenticated");
});

app.get("/login", (request, response) => {
  const successMessage = request.query.success || null;
  response.render("login", { errorMessage: null, successMessage });
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return response.render("login", {
        errorMessage: "Invalid username or password.",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return response.render("login", {
        errorMessage: "Invalid username or password.",
      });
    }

    request.session.userId = user._id;
    response.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    response.render("login", {
      errorMessage: "An error occurred during login.",
    });
  }
});

app.get("/signup", async (request, response) => {
  return response.render("signup", { errorMessage: null });
});

app.post("/signup", async (request, response) => {
  const { username, password, isAdmin } = request.body;
  const adminStatus = isAdmin === "on";

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return response.render("signup", {
        errorMessage: "Sorry, this username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      isAdmin: adminStatus,
    });
    await newUser.save();

    request.session.userId = newUser._id;
    response.redirect("/login?success=Account successfully created!");
  } catch (error) {
    console.error("Error creating user:", error);
    response.render("signup", {
      errorMessage: "An error occurred while creating your account.",
    });
  }
});

app.get("/dashboard", requireLogin, async (request, response) => {
  try {
    const currentUser = await User.findById(request.session.userId).lean();

    if (!currentUser) {
      return response.status(404).send("User not found.");
    }

    // Check if user is banned
    if (currentUser.standing === "banned") {
      return response.render("banned", { username: currentUser.username });
    }

    const users = await User.find({}, "username").lean(); // Fetch all usernames
    response.render("authenticated", {
      users,
    });
  } catch (error) {
    console.error("Failed to load users:", error);
    response.status(500).send("Internal Server Error");
  }
});

// GET /profile → Show the currently logged-in user's own profile
app.get("/profile", requireLogin, async (request, response) => {
  try {
    const user = await User.findById(request.session.userId); //  Find the logged-in user using session ID

    if (!user) {
      return response.redirect("/login"); //  If user not found, redirect to login page
    }

    response.render("profile", {
      profileUser: user,
      currentUser: user,
    });
  } catch (err) {
    console.error("Error loading own profile:", err);
    response.status(500).send("Internal Server Error");
  }
});

// GET /profile/:username → Show user's profile by username
app.get("/profile/:username", requireLogin, async (request, response) => {
  try {
    const profileUser = await User.findOne({
      username: request.params.username,
    });

    if (!profileUser) {
      return response.status(404).send("User not found.");
    }

    response.render("profile", { profileUser });
  } catch (error) {
    console.error("Error loading user profile:", error);
    response.status(500).send("Internal Server Error");
  }
});

app.post("/logout", (request, response) => {
  request.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      response.redirect("/");
    }
    response.redirect("/");
  });
});

// GET /admin → Show admin panel
app.get("/admin", requireLogin, requireAdmin, async (request, response) => {
  try {
    const users = await User.find(); // Fetch all users
    response.render("admin", { users }); // Pass users to the EJS template
  } catch (error) {
    console.error("Error fetching users:", error);
    response.status(500).send("Internal Server Error");
  }
});

// GET /admin/edit/:userId → Show edit form for a specific user
app.post(
  "/admin/delete/:userId",
  requireLogin,
  requireAdmin,
  async (request, response) => {
    try {
      const userToDelete = await User.findById(request.params.userId);

      // Check if the user to delete is also an admin
      if (userToDelete && userToDelete.isAdmin) {
        return response.status(403).send("Cannot delete another admin.");
      }

      await User.findByIdAndDelete(request.params.userId);
      response.redirect("/admin");
    } catch (error) {
      console.error("Error deleting user:", error);
      response.status(500).send("Internal Server Error");
    }
  }
);

// POST /admin/ban/:userId → Ban a specific user
app.post(
  "/admin/ban/:userId",
  requireLogin,
  requireAdmin,
  async (request, response) => {
    try {
      const userToBan = await User.findById(request.params.userId);

      if (userToBan && userToBan.isAdmin) {
        return response.status(403).send("Cannot ban another admin.");
      }

      userToBan.standing = "banned";
      await userToBan.save();

      response.redirect("/admin");
    } catch (error) {
      console.error("Error banning user:", error);
      response.status(500).send("Internal Server Error");
    }
  }
);

// POST /admin/unban/:userId → Unban a specific user
app.post("/admin/unban/:id", requireLogin, requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { standing: "good" });
    res.redirect("/admin");
  } catch (error) {
    console.error("Error unbanning user:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/online-count", (req, res) => {
  res.json({ count: connectedClients.length });
});

// WebSocket connection
app.ws("/ws", (socket, request) => {
  if (!request.session.userId) {
    return socket.close();
  }

  User.findById(request.session.userId)
    .lean()
    .then((user) => {
      if (!user) {
        console.log("WS: session userId invalid, closing socket");
        return socket.close();
      }

      onNewClientConnected(socket, connectedClients, user);

      socket.on("message", async (raw) => {
        const msg = parse(raw);
        if (!msg) return;

        if (msg.type === WS_EVENTS.MESSAGE) {
          await onNewMessage(msg.payload, user, connectedClients);
        }
      });

      socket.on("close", () => {
        onClientDisconnected(socket, connectedClients, user);
      });
    })
    .catch((err) => {
      console.error("WS user lookup error:", err);
      socket.close();
    });
});

mongoose
  .connect(MONGO_URI)
  .then(() =>
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    )
  )
  .catch((err) => console.error("MongoDB connection error:", err));
