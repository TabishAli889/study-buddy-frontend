# Study Buddy - Frontend

React (Vite) UI for the Study Buddy backend: upload a PDF, view a summary, take an interactive quiz.

## Setup

1. **Install Node.js** if you don't have it: https://nodejs.org (LTS version)

2. **Install dependencies** (in this `frontend` folder):
   ```bash
   npm install
   ```

3. **Make sure your backend is running first** (in a separate terminal, in the `backend` folder):
   ```bash
   uvicorn main:app --reload
   ```
   It should be running at `http://127.0.0.1:8000`.

4. **Run the frontend:**
   ```bash
   npm run dev
   ```

5. Open the URL it prints (usually `http://localhost:5173`) in your browser.

## How to use

1. Drag a PDF (or click "Choose PDF") and hit "Upload & Process"
2. Switch to the **Summary** tab and click "Generate Summary"
3. Switch to the **Quiz** tab, pick how many questions, and click "Generate Quiz"
4. Click an answer on each question to see if you got it right, plus an explanation

## If something doesn't connect

- "Can't reach the backend" error → make sure `uvicorn main:app --reload` is running in the backend folder, in its own terminal, before you use the frontend.
- CORS errors in the browser console → double check the backend's `main.py` still has the `CORSMiddleware` block (it should, out of the box).

## Next steps once this works

- Deploy the backend (Render or Railway, free tier) and the frontend (Vercel or Netlify, free tier) so you have a live link to put on LinkedIn and your resume.
- Optional: support multiple documents at once instead of replacing the current one on each upload.
