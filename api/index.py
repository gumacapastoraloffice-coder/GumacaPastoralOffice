import os
import time
import uuid
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from supabase import create_client, Client

# Initialize Flask app
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = Flask(__name__, 
            template_folder=os.path.join(BASE_DIR, 'templates'),
            static_folder=os.path.join(BASE_DIR, 'static'))
app.secret_key = 'gumaca_diocese_2026'   # Secret key for session management

# ============================
# SUPABASE CONFIGURATION
# ============================
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://aqjntcwabirrdsfkppxt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_FueZsEKKIPTtcZ0onMPAhA_Y1CSvzdi")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Bucket name (make sure this exists in Supabase Storage dashboard)
BUCKET_NAME = "uploads"

# ============================
# ROUTES
# ============================

# Home page
@app.route('/')
def index():
    is_admin = session.get('logged_in', False)
    return render_template('index.html', is_admin=is_admin)

# Admin login
@app.route('/login_admin', methods=['POST'])
def login():
    data = request.json
    if data.get('username') == "admin" and data.get('password') == "GumacaDiocese":
        session['logged_in'] = True
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Invalid Credentials"}), 401

# Admin logout
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

# Register new member (admin only)
@app.route('/register_member', methods=['POST'])
def register_member():
    if not session.get('logged_in'):
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    try:
        data = request.json
        supabase.table("members").insert(data).execute()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# Get all members (with access level control)
@app.route('/get_members')
def get_members():
    try:
        res = supabase.table("members").select("*").execute()
        # For viewers, only return limited fields: name, designation, organization, parish, address
        if not session.get('logged_in'):
            limited_data = []
            for member in res.data:
                limited_data.append({
                    "name": member.get("name", ""),
                    "designation": member.get("designation", ""),
                    "organization": member.get("organization", ""),
                    "parish": member.get("parish", ""),
                    "address": member.get("address", ""),
                    "_isViewer": True  # Flag to indicate viewer data
                })
            return jsonify(limited_data)
        # Admin gets all information
        return jsonify(res.data)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Upload post with attachments (members/leaders)
@app.route('/upload_post', methods=['POST'])
def upload_post():
    try:
        content = request.form.get("content")
        files = request.files.getlist("files")

        uploaded_urls = []
        for file in files:
            # Read file as bytes
            file_bytes = file.read()

            # Generate a unique filename (timestamp + uuid) to avoid duplicates
            base, ext = os.path.splitext(file.filename)
            unique_name = f"{int(time.time() * 1000)}_{uuid.uuid4().hex}{ext}"

            # Upload to Supabase Storage bucket
            supabase.storage.from_(BUCKET_NAME).upload(unique_name, file_bytes)

            # Get public URL
            public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(unique_name)
            uploaded_urls.append(public_url)

        # Save post record in Supabase "posts" table
        supabase.table("posts").insert({
            "content": content,
            "attachments": uploaded_urls
        }).execute()

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# Get all posts (for Newsfeed)
@app.route('/get_posts')
def get_posts():
    try:
        res = supabase.table("posts").select("*").order("created_at", desc=True).execute()
        return jsonify(res.data)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Main API endpoint for connection test
@app.route('/main')
def main():
    return jsonify({"message": "Connected to API", "status": "ok"})

# ============================
# MAIN ENTRY POINT
# ============================
if __name__ == '__main__':
    app.run(debug=True)
