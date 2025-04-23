[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/2M4tl0xb)
# Real-Time Chat Application

This is the starting point for the **Final Sprint - Team Project**. In this project, you and your group will build a fully functional, real-time chat application using **Express**, **MongoDB**, **EJS templates**, and **WebSockets**.

> **Note:** This final project counts toward **both** your Databases and Fullstack courses. You will submit it once, and the grade will be applied to both courses.

For complete project instructions, requirements, and grading details, refer to the [assignment sheet](https://menglishca.github.io/keyin-course-notes/fullstack/sprints/final-team/).

## Setup Instructions
1. Accept the GitHub Classroom Assignment
2. Once your repository is created, **clone your new repo** to your local machine:  
    ```bash
    git clone <your-new-repo-url>
    ```  
3. Navigate into the project directory and install the necessary dependencies:  
    ```bash
    cd <your-new-repo-name>
    npm install
    ```  
4. Run the app:
    ```bash
    npm start
    ```  
    This will start the server at `http://localhost:3000/`.  

5. You can now begin development, committing changes as a team:
   ```bash
   git add .
   git commit -m "Start final sprint project"
   git push origin main
   ```

## Development Guidelines

1. **Authentication and Authorization**:
   - Users must be able to register and log in securely.
   - Passwords must be hashed using `bcrypt`.
   - Only authenticated users can access chat and profile pages.
   - Admin users have access to a special dashboard.

2. **Chat System**:
   - Use WebSockets (`express-ws`) to enable real-time chat.
   - Chat messages should be stored in MongoDB and include:
     - Sender's name
     - Message content
     - Timestamp
   - Users must see messages sent **since** they logged in.
   - Online users and system notifications (e.g., "User X has joined") must be displayed.

3. **User Management**:
   - Users have profile pages (join date, username).
   - Admins can view and remove/ban users via the admin dashboard.

4. **MongoDB Integration**:
   - Use MongoDB for persistent data (users, messages).
   - In-memory storage is only permitted for temporary data like active sessions.

5. **EJS Templates**:
   - All pages must use EJS for rendering.
   - A shared header partial should include navigation (logout, profile, chat, admin).

## Submission Guidelines
- Submit a link to your **GitHub Classroom repository** via Teams.
- Ensure the app runs correctly with `npm start`.
- All required features must be implemented as described in the [assignment sheet](https://menglishca.github.io/keyin-course-notes/fullstack/sprints/final-team/).


## Notes & Support
- Class and code examples can be found [in the code samples repo](https://github.com/menglishca/keyin-code-samples).
- Ask questions on Teams or email if you need clarification.
- Support is available during lectures and TA hours.
