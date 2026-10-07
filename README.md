# OEE Report — Operations Portal

A clean, high-performance web portal designed for centralized access to **Anwar** and **Monir**'s Overall Equipment Effectiveness (OEE) reports.

---

## 🔐 Password Protection (পাসওয়ার্ড সুরক্ষা)

- **Admin Password**: Settings and link publishing are protected with an Admin Password.
- **Default Password**: `admin123`
- **How to Change Password**: Open **Settings** (enter `admin123`), scroll to the **"Admin Password Management"** section, enter your new password, and click **Publish Links**.

---

## 🚀 How to Upload to GitHub (ফোল্ডার ছাড়া সহজে গিটহাবে আপলোড)

GitHub-এর ওয়েবসাইট ইন্টারফেসে ফোল্ডার ড্র্যাগ-অ্যান্ড-ড্রপ করা যায় না। তাই এই প্রজেক্টের প্রয়োজনীয় সব ফাইল সরাসরি প্রধান ফোল্ডারে (root) রাখা হয়েছে!

### ৩ ধাপে গিটহাবে আপলোড করুন (No folders required!):

#### ধাপ ১: ফাইল নির্বাচন
আপনার প্রজেক্ট ফোল্ডার থেকে শুধু নিচের **৫টি ফাইল** নির্বাচন করুন:
- `index.html`
- `style.css`
- `app.js`
- `data.json`
- `favicon.svg`

*(অথবা ফোল্ডারে থাকা `oee-report-github.zip` ফাইলটি ডাউনলোড করে আনজিপ করতে পারেন)*

#### ধাপ ২: GitHub-এ আপলোড
1. [github.com](https://github.com) এ লগইন করুন এবং **"New repository"** তৈরি করুন (নাম দিন যেমন: `oee-report`)।
2. রিপোজিটোরি তৈরি হলে পেজে থাকা **"uploading an existing file"** লিংকে ক্লিক করুন।
3. আপনার ওই ৫টি ফাইল টেনে এনে (Drag & Drop) ছেড়ে দিন।
4. নিচে সবুজ রঙের **"Commit changes"** বাটনে ক্লিক করুন।

#### ধাপ ৩: ১ ক্লিকে ফ্রি লাইভ ওয়েবসাইট (GitHub Pages) চালু করুন
1. রিপোজিটোরির **Settings** ট্যাবে যান।
2. বামদিকের সাইডবার থেকে **Pages** এ ক্লিক করুন।
3. **Build and deployment** এর নিচে:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` এবং ফোল্ডার `/ (root)` সিলেক্ট করুন।
   - **Save** বাটনে ক্লিক করুন।
4. ব্যস! ১ মিনিটের মধ্যে আপনার ওয়েবসাইট ফ্রি ও সুরক্ষিতভাবে লাইভ হয়ে যাবে:
   ```
   https://your-username.github.io/oee-report/
   ```

---

## 💻 How to Run Locally (কম্পিউটারে লোকাল চালানোর নিয়ম)

### Option 1: Double-Click Launcher (Windows)
ফোল্ডারে থাকা **`start.bat`** ফাইলে ডাবল-ক্লিক করলেই সার্ভার ও ব্রাউজার একসাথে ওপেন হবে।

### Option 2: Run with Node.js
```bash
node server.js
```
Open [http://localhost:3000](http://localhost:3000)

### Option 3: Run with Python 3
```bash
python server.py
```
Open [http://localhost:3000](http://localhost:3000)

### Option 4: Direct Offline / Browser File
যেকোনো ব্রাউজারে সরাসরি `index.html` ওপেন করলেও এটি চলবে (LocalStorage মোডে)।

---

## 📝 ফাইল তালিকা (Flat Root Structure)

```
OEE WEBSITE/
├── index.html               # প্রধান ওয়েবসাইট পেজ (HTML)
├── style.css                # প্রিমিয়াম মিনিমালিস্ট সিএসএস ডিজাইন
├── app.js                   # জাভাস্ক্রিপ্ট লজিক ও পাসওয়ার্ড সুরক্ষা
├── data.json                # আনোয়ার ও মনিরের লিংক ও কনফিগারেশন
├── favicon.svg              # লোগো আইকন
├── oee-report-github.zip    # গিটহাবের জন্য তৈরি জিপ প্যাকেজ
├── create-github-zip.bat    # নতুন জিপ তৈরি করার স্ক্রিপ্ট
├── server.js                # নোড.জেএস ব্যাকএন্ড সার্ভার
├── server.py                # পাইথন ব্যাকএন্ড সার্ভার
├── start.bat                # এক ক্লিকে চালু করার ফাইল
├── package.json             # প্রজেক্ট কনফিগ
└── README.md                # ব্যবহার নির্দেশিকা
```
