# 🎓 VU Education Lab AI Assistant for Teachers

<div align="center">

[![Version](https://img.shields.io/badge/version-3.2.0-blue.svg)](https://github.com/jasp-nerd/AI-Lesson-Helper)
[![License](https://img.shields.io/github/license/jasp-nerd/AI-Lesson-Helper)](LICENSE)
[![Powered by Gemini AI](https://img.shields.io/badge/Powered%20by-Gemini%20AI-orange.svg)](https://ai.google.dev/)

**Transform any webpage into valuable educational content with AI-powered analysis**

*Developed by Vrije Universiteit Amsterdam Education Lab*

<img src="https://i.imgur.com/9qX7e7c.png" alt="VU Education Lab AI Assistant" width="600">

[📥 Install Extension](#installation) • [🚀 Quick Start](#quick-start) • [📖 Documentation](#detailed-usage-guide)

</div>

## 🌟 Why Choose This Extension?

The VU Education Lab AI Assistant empowers educators to seamlessly convert web content into pedagogically sound teaching materials. Whether you're preparing lectures, creating assessments, or looking for new ways to engage students, this extension provides instant, AI-powered educational insights from any webpage.

**Perfect for:** Course preparation, lesson planning, quiz creation, content simplification, and discovering teaching opportunities in online resources.

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 📝 Content Analysis
Transform web content into educational materials with AI-powered analysis that understands pedagogical needs.

### 📊 Smart Assessments  
Generate quizzes, questions, and evaluation materials tailored to your teaching objectives and student levels.

### 🎯 Adaptive Learning
Simplify complex topics and create explanations suitable for different educational backgrounds.

</td>
<td width="50%">

### 🏫 Teaching Support
Get practical suggestions for lectures, discussions, activities, and assignments based on any webpage.

### 🌐 Multilingual Ready
Full support for English and Dutch interfaces with intelligent language detection.

### 🔒 Privacy & Security
VU-only authentication via Google OAuth, secure backend processing with minimal data access.

</td>
</tr>
</table>

<div align="center">

<img src="https://i.imgur.com/J72b6Zd.png" alt="Extension Interface" width="500">

*Clean, intuitive interface designed for educators*

</div>

## 📥 Installation

1. **Download**: Clone or download this repository
2. **Chrome Extensions**: Navigate to `chrome://extensions/`
3. **Developer Mode**: Enable the toggle in the top-right corner
4. **Load Extension**: Click "Load unpacked" and select the extension folder

## 🔐 Google OAuth Setup (Required)

This extension is **restricted to VU Amsterdam users only** (emails ending with `@vu.nl` or `@student.vu.nl`). To enable Google OAuth authentication, you need to configure the extension with your OAuth2 credentials.

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** or **People API** for your project

### Step 2: Create OAuth2 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Chrome Extension** as the application type
4. For **Item ID**, you'll need your Chrome Extension ID:
   - Load the unpacked extension in Chrome
   - Go to `chrome://extensions/`
   - Find your extension and copy the **ID** (long string of letters)
5. Add authorized JavaScript origins (if needed)
6. Click **Create**
7. Copy the **Client ID** (it will look like: `xxxxxxxxxxxx.apps.googleusercontent.com`)

### Step 3: Configure the Extension

1. Open `manifest.json` in the extension folder
2. Find the `oauth2` section and replace `YOUR_CLIENT_ID` with your actual Client ID:
   ```json
   "oauth2": {
     "client_id": "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com",
     "scopes": [
       "https://www.googleapis.com/auth/userinfo.email",
       "https://www.googleapis.com/auth/userinfo.profile"
     ]
   }
   ```
3. Find the `key` field and replace `YOUR_EXTENSION_KEY_HERE` with your extension's public key:
   - To get the public key, load the extension once
   - Go to `chrome://extensions/`
   - Click **Pack extension** and pack your extension folder
   - The public key will be in the generated `.pem` file or shown in the console
   - Alternatively, you can find the key in `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions\[YOUR_EXTENSION_ID]` (Windows) or similar paths on Mac/Linux

### Step 4: Reload the Extension

1. Go to `chrome://extensions/`
2. Click the **Reload** button on your extension
3. Open the extension - you should now see the **Sign in with Google** button
4. Sign in with your VU email address

### 🔒 Authentication Features

- ✅ **Email Domain Validation**: Only `@vu.nl` and `@student.vu.nl` emails are allowed
- ✅ **Automatic Token Management**: OAuth tokens are securely stored and managed
- ✅ **Sign Out Capability**: Users can sign out at any time
- ✅ **Session Persistence**: Authentication persists across browser sessions

### ⚠️ Important Notes

- **User Consent**: Users must grant permission to access their Google profile and email
- **Privacy**: Only email and name are accessed - no other personal data
- **VU Restriction**: Non-VU email addresses will be rejected automatically
- **Token Security**: OAuth tokens are stored locally and can be revoked at any time

## 🚀 Quick Start

<div align="center">

**Ready in 30 seconds** ⏱️

</div>

### Step 1: Install & Authenticate
After installation, sign in with your VU email address. The extension automatically connects to our secure backend.

### Step 2: Navigate & Analyze  
Visit any educational webpage and click the extension icon in your toolbar.

### Step 3: Choose Your Tool
<div align="center">

| Tool | Purpose | Best For |
|------|---------|----------|
| 📝 **Summarize** | Condense content | Quick overviews, key points |
| ❓ **Quiz** | Generate questions | Assessments, student engagement |
| 💡 **Explain** | Simplify concepts | Complex topics, different levels |
| 🎓 **Teaching** | Get activity ideas | Lesson planning, classroom activities |
| ⚡ **Custom** | Ask anything | Specific analysis needs |

</div>

### Step 4: Generate & Use
Select your preferences, click "Generate", and copy the results directly to your lesson plans!

---

## 📖 Detailed Usage Guide

### 🎯 Smart Content Processing
The extension intelligently analyzes webpage content including headings, paragraphs, and lists to provide contextually relevant educational materials.

### 🔧 Customization Options
Each tool offers tailored settings:
- **Length options** for summaries (Short, Medium, Long)
- **Question types** for quizzes (Multiple Choice, True/False, Short Answer, Mixed)  
- **Complexity levels** for explanations (Beginner, Intermediate, Advanced)
- **Format preferences** for teaching suggestions (Lecture, Discussion, Activity, Assessment)

### 📋 Pre-built Templates
Access ready-to-use prompts for common educational tasks:
- Main Arguments Analysis • Concept Mapping • Student Implications
- Bias Analysis • Multi-modal Representations • Reflection Questions

### ⚙️ Settings & Preferences
- **Language Selection**: Switch between English and Dutch
- **Floating Popup**: Optional quick-access overlay
- **Backend Status**: Monitor connection health
- **AI Literacy Resources**: Educational guides and best practices

---

## 📞 Support & Contact

<div align="center">

**Need Help?** We're here for you!

📧 [onderwijswerkplaats@vu.nl](mailto:onderwijswerkplaats@vu.nl) • 📚 [AI Literacy Resources](settings.html) • 🐛 [Report Issues](https://github.com/jasp-nerd/AI-Lesson-Helper/issues)

</div>

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

## 🏛️ About VU Education Lab

**Developed with ❤️ by the Vrije Universiteit Amsterdam Education Lab**

*Empowering educators with responsible AI tools for enhanced teaching and learning*

[🌐 Visit VU Education Lab](https://vu.nl/onderwijswerkplaats) • [🎓 Learn More About VU](https://vu.nl)

---

**⭐ Star this project if it helps your teaching!**

*Made with educators, for educators* 🎓

</div>