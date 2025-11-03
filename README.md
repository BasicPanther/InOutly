InOutly — Employee Management & Attendance Tracker

InOutly is a lightweight and efficient employee management and attendance tracking system built with Node.js.
It provides an intuitive dashboard interface for administrators and a mobile-friendly UI for employees to log attendance seamlessly.

🛠️ Prerequisites

Before starting, ensure you have Node.js installed.
 Download it from https://nodejs.org

Check your installation:

node -v
npm -v

 Setup & Run Instructions

Open the project folder in your terminal or PowerShell.

Allow script execution (for Windows PowerShell users only):

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass


Start the server:

node server.js

 Access the Application

Once the server is running, you can access the two interfaces:

 Dashboard (on your computer)
http://localhost:8080

 Phone UI (on your phone or another device on the same Wi-Fi)

Replace {YOUR_IP_V4} with your local IP address, for example 192.168.1.5:

http://{YOUR_IP_V4}/phone


 Tip:
To find your IPv4 address, run this command in your terminal or PowerShell:

ipconfig


Look for the line labeled IPv4 Address under your active network connection.
