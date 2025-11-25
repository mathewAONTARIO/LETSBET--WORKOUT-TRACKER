LETSBET – Workout Tracker
This is my Personal Project
LETSBET is a workout tracker built with Node.js, Express, MongoDB (Mongoose), EJS, Bootstrap, and custom CSS.

Features
- Add, edit, delete, and duplicate workouts  
- Weekly dashboard with stats  
- Streak tracking  
- Stats page with volume chart  
- 30-day calendar heatmap  
- Clean dark UI with shared header/footer  

Tech Used
Node.js, Express, MongoDB, Mongoose, EJS, Bootstrap 5, Chart.js

Setup
1. Install dependencies:  
   `npm install`
2. Add `.env` file:  
   MONGO_URI=mongodb+srv://mathewarogbo_db_user:Nothew123@cluster0.pndntj6.mongodb.net/keep-going
PORT=3000
3. Start server:  
   `npm start`

Folder Structure
letsbet/
app.js
config/
db.js
models/
Workout.js
routes/
index.js
workoutRoutes.js
controllers/
workoutController.js
views/
index.ejs
partials/
header.ejs
footer.ejs
workouts/
list.ejs
new.ejs
edit.ejs
delete.ejs
streak.ejs
stats.ejs
calendar.ejs
day.ejs
settings.ejs
public/
css/style.css
img/
.env (ignored)
.gitignore
package.json
