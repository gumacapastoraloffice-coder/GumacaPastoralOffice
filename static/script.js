/* ============================
   SECTION SWITCHING
   ============================ */
function showSection(sec) {
    document.getElementById('feed-section').style.display = (sec === 'feed') ? 'block' : 'none';
    document.getElementById('directory-section').style.display = (sec === 'directory') ? 'block' : 'none';

    // Auto-close the sidebar after selecting a section (mobile-friendly behavior)
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
}

/* ============================
   MODALS
   ============================ */
function showModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

/* ============================
   SIDEBAR MENU
   ============================ */
function toggleMenu() {
    document.querySelector('.sidebar').classList.toggle('open');
}

/* ============================
   ADMIN LOGIN
   ============================ */
async function handleLogin() {
    const username = document.getElementById('admin-user').value;
    const password = document.getElementById('admin-pass').value;

    const res = await fetch('/login_admin', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password })
    });

    if (res.ok) window.location.reload();
    else alert("Maling login details!");
}

/* ============================
   MEMBER REGISTRATION
   ============================ */
async function saveMember() {
    const data = {
        name: document.getElementById('m-name').value,
        parish: document.getElementById('m-parish').value,
        birthdate: document.getElementById('m-birth').value,
        age: document.getElementById('m-age').value,
        joined_year: document.getElementById('m-joined').value,
        email: document.getElementById('m-email').value,
        fb_account: document.getElementById('m-fb').value,
        mobile_account: document.getElementById('m-mobile').value,
        organization: document.getElementById('m-org').value,
        designation: document.getElementById('m-desig').value,
        address: document.getElementById('m-addr').value
    };

    const res = await fetch('/register_member', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });

    if (res.ok) {
        alert("Saved!");
        location.reload();
    } else {
        alert("Error saving data.");
    }
}

/* ============================
   DIRECTORY LOADING
   ============================ */
let allMembers = [];
let isViewerData = false;

async function loadMembers() {
    try {
        const res = await fetch('/get_members');
        if (!res.ok) throw new Error("Failed to fetch members");
        allMembers = await res.json();
        
        // Check if this is viewer data
        isViewerData = allMembers.length > 0 && allMembers[0]._isViewer === true;
        
        updateTableHeader();
        displayMembers(allMembers);
        setupSearch();
    } catch (err) {
        alert("Error loading members: " + err.message);
    }
}

function updateTableHeader() {
    const header = document.getElementById('tableHeader');
    if (isViewerData) {
        // Viewer sees: Name, Designation, Parish, Address
        header.innerHTML = '<tr><th>Name</th><th>Designation</th><th>Parish</th><th>Address</th></tr>';
    } else {
        // Admin sees all columns
        header.innerHTML = '<tr><th>Name</th><th>Birthdate</th><th>Age</th><th>Joined</th><th>Email</th><th>FB Account</th><th>Mobile</th><th>Organization</th><th>Designation</th><th>Parish</th><th>Address</th></tr>';
    }
}

function displayMembers(members) {
    const tbody = document.getElementById('memberData');
    
    if (isViewerData) {
        // Viewer view: Name, (Designation + Organization), Parish, Address
        tbody.innerHTML = members.map(m => `
            <tr>
                <td><strong>${m.name}</strong></td>
                <td>${m.designation || ''} ${m.organization ? '(' + m.organization + ')' : ''}</td>
                <td>${m.parish || ''}</td>
                <td>${m.address || ''}</td>
            </tr>
        `).join('');
    } else {
        // Admin view: All information
        tbody.innerHTML = members.map(m => `
            <tr>
                <td><strong>${m.name}</strong></td>
                <td>${m.birthdate || ''}</td>
                <td>${m.age || ''}</td>
                <td>${m.joined_year || ''}</td>
                <td>${m.email || ''}</td>
                <td>${m.fb_account || ''}</td>
                <td>${m.mobile_account || ''}</td>
                <td>${m.organization || ''}</td>
                <td>${m.designation || ''}</td>
                <td>${m.parish || ''}</td>
                <td>${m.address || ''}</td>
            </tr>
        `).join('');
    }
}

function setupSearch() {
    const searchInput = document.getElementById('member-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const filtered = allMembers.filter(m => {
                const matchName = m.name && m.name.toLowerCase().includes(query);
                const matchDesig = m.designation && m.designation.toLowerCase().includes(query);
                const matchOrg = m.organization && m.organization.toLowerCase().includes(query);
                
                if (isViewerData) {
                    // Viewers can search: Name, Designation, Parish
                    const matchParish = m.parish && m.parish.toLowerCase().includes(query);
                    return matchName || matchDesig || matchOrg || matchParish;
                } else {
                    // Admins can search all fields
                    const matchParish = m.parish && m.parish.toLowerCase().includes(query);
                    const matchAddr = m.address && m.address.toLowerCase().includes(query);
                    const matchEmail = m.email && m.email.toLowerCase().includes(query);
                    const matchBirth = m.birthdate && m.birthdate.toLowerCase().includes(query);
                    return matchName || matchDesig || matchOrg || matchParish || matchAddr || matchEmail || matchBirth;
                }
            });
            displayMembers(filtered);
        });
    }
}

/* ============================
   NEWSFEED LOADING
   ============================ */
async function loadPosts() {
    try {
        const res = await fetch('/get_posts');
        if (!res.ok) throw new Error("Failed to fetch posts");
        const posts = await res.json();
        const container = document.getElementById('newsfeed-list');
        container.innerHTML = '';

        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'card';

            // Post text
            if (post.content) {
                const text = document.createElement('p');
                text.textContent = post.content;
                card.appendChild(text);
            }

            // Attachments
            if (post.attachments && post.attachments.length > 0) {
                post.attachments.forEach(url => {
                    if (url.match(/\.(jpg|jpeg|png|gif)$/i)) {
                        const img = document.createElement('img');
                        img.src = url;
                        img.style.maxWidth = "100%";
                        img.style.borderRadius = "10px";
                        card.appendChild(img);
                    } else if (url.match(/\.(mp4|webm)$/i)) {
                        const video = document.createElement('video');
                        video.src = url;
                        video.controls = true;
                        video.style.maxWidth = "100%";
                        video.style.borderRadius = "10px";
                        card.appendChild(video);
                    } else {
                        const link = document.createElement('a');
                        link.href = url;
                        link.textContent = "📄 Download file";
                        link.target = "_blank";
                        card.appendChild(link);
                    }
                });
            }

            container.appendChild(card);
        });
    } catch (err) {
        alert("Error loading posts: " + err.message);
    }
}

/* ============================
   POST BOX INTERACTIONS
   ============================ */
const textarea = document.getElementById("post-content");
const postBtn = document.getElementById("post-btn");
const fileInput = document.getElementById("file-upload");
const previewContainer = document.getElementById("attachment-preview");
const charCount = document.getElementById("char-count");

/* AUTO EXPAND TEXTAREA */
textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
    updateButton();
    updateCount();
});

/* CHARACTER COUNT */
function updateCount(){
    let len = textarea.value.length;
    charCount.textContent = len + " / 500";
}

/* ENABLE/DISABLE POST BUTTON */
function updateButton(){
    if(textarea.value.trim() !== "" || fileInput.files.length > 0){
        postBtn.disabled = false;
    } else {
        postBtn.disabled = true;
    }
}

/* FILE PREVIEW HANDLING (MULTIPLE FILES) */
fileInput.addEventListener("change", function(){
    previewContainer.innerHTML = "";
    previewContainer.style.display = this.files.length ? "block" : "none";

    // Remove all attachments button
    let removeBtn = document.createElement("button");
    removeBtn.className = "remove-attachment";
    removeBtn.innerText = "✕";
    removeBtn.onclick = () => {
        fileInput.value = "";
        previewContainer.style.display = "none";
        previewContainer.innerHTML = "";
        updateButton();
    };
    previewContainer.appendChild(removeBtn);

    // Loop through ALL selected files
    Array.from(this.files).forEach(file => {
        if(file.type.startsWith("image/")){
            const img = document.createElement("img");
            img.className = "preview-image";
            const reader = new FileReader();
            reader.onload = e => img.src = e.target.result;
            reader.readAsDataURL(file);
            previewContainer.appendChild(img);
        }
        else if(file.type.startsWith("video/")){
            const video = document.createElement("video");
            video.className = "preview-video";
            video.controls = true;
            const reader = new FileReader();
            reader.onload = e => video.src = e.target.result;
            reader.readAsDataURL(file);
            previewContainer.appendChild(video);
        }
        else {
            const fileBox = document.createElement("div");
            fileBox.className = "preview-file";
            fileBox.innerHTML = "📄 " + file.name;
            previewContainer.appendChild(fileBox);
        }
    });

    updateButton();
});

/* DRAG & DROP FILES INTO TEXTAREA */
textarea.addEventListener("dragover", e => e.preventDefault());
textarea.addEventListener("drop", e => {
    e.preventDefault();
    fileInput.files = e.dataTransfer.files;
    fileInput.dispatchEvent(new Event("change"));
});

/* POST SUBMISSION */
postBtn.addEventListener("click", async () => {
    const formData = new FormData();
    formData.append("content", textarea.value);
    Array.from(fileInput.files).forEach(file => {
        formData.append("files", file);
    });

    const res = await fetch("/upload_post", {
        method: "POST",
        body: formData
    });
    const data = await res.json();

    if (data.success) {
        alert("Post uploaded!");
        textarea.value = "";
        fileInput.value = "";
        previewContainer.innerHTML = "";
        previewContainer.style.display = "none";
        updateButton();
        updateCount();
        loadPosts(); // refresh newsfeed
    } else {
        alert("Error: " + data.error);
    }
});

/* ============================
   INITIAL LOAD
   ============================ */
window.onload = () => {
    loadMembers();
    loadPosts();
    updateButton();
};
// Test connection to API
fetch('/api/main')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error('Error connecting to API: - script.js:354', err));

