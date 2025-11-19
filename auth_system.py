import json
import hashlib
import os
from pathlib import Path
from datetime import datetime

class AuthSystem:
    """Authentication system for user login and registration"""
    
    def __init__(self):
        self.users_file = Path("users.json")
        self.initialize_users()
    
    def initialize_users(self):
        """Initialize users file with default admin account"""
        if not self.users_file.exists():
            default_users = {
                "admin": {
                    "password": self.hash_password("12345"),
                    "created_at": datetime.now().isoformat(),
                    "last_login": None
                }
            }
            self.save_users(default_users)
    
    def hash_password(self, password):
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def load_users(self):
        """Load users from JSON file"""
        try:
            with open(self.users_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading users: {e}")
            return {}
    
    def save_users(self, users):
        """Save users to JSON file"""
        try:
            with open(self.users_file, 'w') as f:
                json.dump(users, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving users: {e}")
            return False
    
    def register_user(self, username, password):
        """Register a new user"""
        # Validate username
        if not username or len(username.strip()) < 3:
            return False, "Username must be at least 3 characters long"
        
        # Validate password
        if not password or len(password) < 4:
            return False, "Password must be at least 4 characters long"
        
        username = username.strip().lower()
        
        # Check if username already exists
        users = self.load_users()
        if username in users:
            return False, "Username already exists"
        
        # Add new user
        users[username] = {
            "password": self.hash_password(password),
            "created_at": datetime.now().isoformat(),
            "last_login": None
        }
        
        if self.save_users(users):
            return True, "Registration successful! You can now login."
        else:
            return False, "Error saving user data"
    
    def login_user(self, username, password):
        """Authenticate user login"""
        if not username or not password:
            return False, "Please enter both username and password"
        
        username = username.strip().lower()
        users = self.load_users()
        
        # Check if user exists
        if username not in users:
            return False, "Invalid username or password"
        
        # Verify password
        if users[username]["password"] != self.hash_password(password):
            return False, "Invalid username or password"
        
        # Update last login
        users[username]["last_login"] = datetime.now().isoformat()
        self.save_users(users)
        
        return True, f"Welcome back, {username}!"
    
    def get_user_info(self, username):
        """Get user information"""
        users = self.load_users()
        if username in users:
            user_data = users[username].copy()
            user_data.pop('password', None)  # Don't return password
            return user_data
        return None
    
    def change_password(self, username, old_password, new_password):
        """Change user password"""
        username = username.strip().lower()
        users = self.load_users()
        
        # Verify old password
        if username not in users or users[username]["password"] != self.hash_password(old_password):
            return False, "Current password is incorrect"
        
        # Validate new password
        if len(new_password) < 4:
            return False, "New password must be at least 4 characters long"
        
        # Update password
        users[username]["password"] = self.hash_password(new_password)
        
        if self.save_users(users):
            return True, "Password changed successfully!"
        else:
            return False, "Error updating password"
    
    def get_all_users(self):
        """Get list of all usernames (for admin purposes)"""
        users = self.load_users()
        return list(users.keys())
