// --- DOM Elements ---

// Views
const viewHome = document.getElementById('view-home');
const viewPost = document.getElementById('view-post');

// Containers
const blogList = document.getElementById('blog-list');
const fullPostContent = document.getElementById('full-post-content');

// Buttons
const btnHome = document.getElementById('btn-home');
const btnBack = document.getElementById('back-btn');

// --- Feedback Helper ---
const FEEDBACK_CLASSES = ['feedback-loading', 'feedback-success', 'feedback-warning', 'feedback-error'];

function setFeedback(message, state) {
    feedbackMessage.textContent = message;
    feedbackMessage.classList.remove(...FEEDBACK_CLASSES);
    if (state) {
        feedbackMessage.classList.add(`feedback-${state}`);
    }
}


// --- Navigation Functions ---

function goHome() {
    viewHome.style.display = 'block';
    viewPost.style.display = 'none';
}

function goToPost() {
    viewHome.style.display = 'none';
    viewPost.style.display = 'block';
}

// --- Event Listeners ---

btnHome.addEventListener('click', () => {
    goHome();
});

btnBack.addEventListener('click', () => {
    goHome();
});

// --- Load Latest Blog Post ---
async function loadLatestPost() {
    try {
        const response = await fetch('/api/posts/latest');
        if (!response.ok) return;

        const post = await response.json();
        const date = new Date(post.date).toLocaleDateString('da-DK', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // Extract first <p> text as excerpt
        const excerptMatch = post.content.match(/<p>(.*?)<\/p>/);
        const excerpt = excerptMatch
            ? excerptMatch[1].replace(/<[^>]*>/g, '').slice(0, 120) + '...'
            : '';

        // Render blog card in home view
        blogList.innerHTML = `
            <article class="blog-card">
                <div class="card-body">
                    <span class="card-tag">Ny</span>
                    <h2 class="card-title">${post.title}</h2>
                    <p class="card-excerpt">${excerpt}</p>
                </div>
                <div class="card-footer">
                    <button class="read-more-btn">Læs mere &rarr;</button>
                </div>
            </article>`;

        // Render full post in post view
        fullPostContent.innerHTML = `
            <h2>${post.title}</h2>
            <time class="post-date">${date}</time>
            ${post.content}`;

        // Attach Read More click handler
        const btnReadMore = blogList.querySelector('.read-more-btn');
        btnReadMore.addEventListener('click', () => {
            goToPost();
        });
    } catch (err) {
        console.error('Error loading latest post:', err);
    }
}

loadLatestPost();

// --- Helper Function: Find URL'er (Regex) ---
function extractUrls(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.match(urlPattern) || [];
}

// --- Form Handling ---

const commentForm = document.getElementById('comment-form');
const feedbackMessage = document.getElementById('feedback-message');

// --- Comment Rendering ---
const commentsList = document.getElementById('comments-list');

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function renderComment(comment) {
    const div = document.createElement('div');
    div.className = 'comment-card';
    const date = new Date(comment.date).toLocaleString('da-DK');
    div.innerHTML = `<div class="comment-header"><strong>${escapeHtml(comment.author)}</strong><time>${date}</time></div><p>${escapeHtml(comment.text)}</p>`;
    return div;
}

if (commentForm) {
    commentForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const author = document.getElementById('comment-author').value;
        const text = document.getElementById('comment-text').value;
        const email = document.getElementById('comment-email').value;
        const subscribe = document.getElementById('comment-subscribe').checked;

        setFeedback("Publicerer din kommentar...", "loading");

        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ author, text, email, subscribe })
            });

            const data = await response.json();

            if (!response.ok) {
                setFeedback(data.error || "Noget gik galt. Prøv igen.", "error");
                return;
            }

            setFeedback("Din kommentar er publiceret!", "success");
            commentsList.prepend(renderComment(data));
            commentForm.reset();
        } catch (error) {
            setFeedback("Fejl: Kunne ikke kontakte serveren. Prøv igen senere.", "error");
            console.error("Comment post error:", error);
        }
    });
}