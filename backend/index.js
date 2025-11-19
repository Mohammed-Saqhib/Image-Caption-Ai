require("dotenv").config();
const app = require("./src/app");
const connectToDb = require("./src/db/db");

// Connect to database
connectToDb();

// Use PORT from environment variable (Vercel provides this)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for Vercel serverless
module.exports = app;
