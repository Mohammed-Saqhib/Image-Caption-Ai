require("dotenv").config();
const mongoose = require("mongoose");
const userModel = require("./src/models/user.model");

async function createAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to database");

    // Check if admin already exists
    const existingAdmin = await userModel.findOne({ username: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists");
      process.exit(0);
    }

    // Create admin user
    const admin = await userModel.create({
      username: "admin",
      password: "12345",
    });

    console.log("Admin user created successfully!");
    console.log("Username: admin");
    console.log("Password: 12345");
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin user:", error.message);
    process.exit(1);
  }
}

createAdmin();
