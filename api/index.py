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

# Mas pinatibay na session configuration para iwas logout sa Vercel serverless environment
app.secret_key = os.getenv("SECRET_KEY", "gumaca_diocese_secured_key_2026")
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

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
        session.permanent = True # Pinapanatiling buhay ang session kahit mag-refresh
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
    # 1. Pagsuri kung ang gumagamit ay naka-login bilang admin
    if not session.get('logged_in'):
        print("❌ Security Trigger: Subok mag-save ang user na hindi admin o na-logout.")
        return jsonify({"success": False, "error": "Unauthorized Session. Please re-login as Admin."}), 403
        
    try:
        data = request.json
        print("📥 Papasok na Data sa Database:", data) # Makita natin sa logs kung anong pinapasa ng JS
        
        # 2. Pagpasa ng record data object direkta sa iyong Supabase core engine table
        res = supabase.table("members").insert(data).execute()
        return jsonify({"success": True})
        
    except Exception as e:
        print("❌ Supabase DB Exception Logged:", str(e)) # Makikita sa Vercel log kung anong column ang may mali
        return jsonify({"success": False, "error": str(e)}), 400

# Get all members (with access level control)
@app.route('/get_members')
def get_members():
    try:
        # Idinagdag ang .order("name", ascending=True) para maging alphabetical base sa Lastname
        res = supabase.table("members").select("*").order("name", ascending=True).execute()
        
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
            
        # Admin gets all information (na naka-alphabetical order na rin!)
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
            file_bytes = file.read()
            base, ext = os.path.splitext(file.filename)
            unique_name = f"{int(time.time() * 1000)}_{uuid.uuid4().hex}{ext}"
            supabase.storage.from_(BUCKET_NAME).upload(unique_name, file_bytes)
            public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(unique_name)
            uploaded_urls.append(public_url)

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
# MAIN ENTRY POINT \ VERCEL COMPLIANCE
# ============================
app.debug = True

if __name__ == '__main__':
    app.run()
