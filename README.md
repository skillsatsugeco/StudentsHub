# StudentsHub 🎓🛒

StudentsHub is a fully decoupled, single-page application designed to empower students to buy and sell products directly within their university communities. It features a modern frontend decoupled from a robust serverless backend utilizing Google Apps script.

## Live Deployment Instructions

### 1. Set Up the Google Apps Script API Backend
1. Go to [Google Apps Script](https://script.google.com/).
2. Create a **New Project** and name it **StudentsHub API**.
3. Clear out the default boilerplate and copy ALL the code from your local `Code.gs` into the Apps Script editor.

### 2. Auto-Generate the Database
1. Select the function named `setupDatabase` from the top dropdown in the Apps script editor.
2. Click the **Run** button.
3. When prompted, authorize the script to access your Google Workspace (this generates the Spreadsheet).
4. **OPTIONAL**: Open the generated `StudentHub_DB` in your Google Drive. On the `Products` sheet, add the word **Unit** to cell K1 (the 11th column).

### 3. Deploy the REST API Endpoint
1. Click the **Deploy** button on the top right.
2. Select **New deployment**.
3. Under "Select type", click the gear icon and select **Web app**.
4. Fill in the deployment details:
   - **Description:** Version 1.0
   - **Execute as:** `Me (<your email>)`
   - **Who has access:** `Anyone`
5. Click **Deploy**.
6. Copy the newly generated **Web app URL** provided.
7. Paste it into the `SCRIPT_URL` variable at the top of your local `script.js` file.

### 4. Run the Application Super Fast
Your application is meant to run statically from a desktop/mobile environment. Just open your `index.html` file in any modern web browser or serve it over a local dev server and enjoy!
