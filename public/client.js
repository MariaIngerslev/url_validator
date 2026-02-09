// --- SPA Router ---

const routes = [
    { path: '/', render: renderHome },
    { path: '/posts/:id', render: renderPost },
];

function matchRoute(pathname) {
    for (const route of routes) {
        const paramNames = [];
        const pattern = route.path.replace(/:([^/]+)/g, (_, name) => {
            paramNames.push(name);
            return '([^/]+)';
        });
        const match = new RegExp(`^${pattern}$`).exec(pathname);
        if (match) {
            const params = {};
            paramNames.forEach((name, i) => {
                params[name] = match[i + 1];
            });
            return { render: route.render, params };
        }
    }
    return null;
}

function navigateTo(url, pushState = true) {
    if (pushState) {
        window.history.pushState(null, '', url);
    }
    const matched = matchRoute(window.location.pathname);
    if (matched) {
        matched.render(matched.params);
    } else {
        renderHome();
    }
}

// Intercept clicks on internal <a> tags
document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    // Only intercept internal links (starting with /)
    if (href && href.startsWith('/') && !href.startsWith('/api')) {
        e.preventDefault();
        navigateTo(href);
    }
});

// Handle back/forward buttons
window.addEventListener('popstate', () => {
    navigateTo(window.location.pathname, false);
});

// --- DOM Elements ---

const viewHome = document.getElementById('view-home');
const viewPost = document.getElementById('view-post');
const blogList = document.getElementById('blog-list');
const fullPostContent = document.getElementById('full-post-content');
const commentsList = document.getElementById('comments-list');
const commentForm = document.getElementById('comment-form');
const feedbackMessage = document.getElementById('feedback-message');

// Track current post ID for comment submission
let currentPostId = null;

// --- Feedback Helper ---
const FEEDBACK_CLASSES = ['feedback-loading', 'feedback-success', 'feedback-warning', 'feedback-error'];

function setFeedback(message, state) {
    feedbackMessage.textContent = message;
    feedbackMessage.classList.remove(...FEEDBACK_CLASSES);
    if (state) {
        feedbackMessage.classList.add(`feedback-${state}`);
    }
}

// --- View Switching ---

function showView(name) {
    viewHome.style.display = name === 'home' ? 'block' : 'none';
    viewPost.style.display = name === 'post' ? 'block' : 'none';
}

// --- Render Functions ---

async function renderHome() {
    showView('home');
    currentPostId = null;

    try {
        const response = await fetch('/api/posts');
        if (!response.ok) return;

        const posts = await response.json();
        blogList.textContent = '';

        posts.forEach((post) => {
            const date = new Date(post.createdAt).toLocaleDateString('da-DK', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            // Extract first <p> text as excerpt
            const excerptMatch = post.content.match(/<p>(.*?)<\/p>/);
            const excerpt = excerptMatch
                ? excerptMatch[1].replace(/<[^>]*>/g, '').slice(0, 120) + '...'
                : '';

            const article = document.createElement('article');
            article.className = 'blog-card';

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';

            const tag = document.createElement('span');
            tag.className = 'card-tag';
            tag.textContent = 'Ny';

            const cardTitle = document.createElement('h2');
            cardTitle.className = 'card-title';
            cardTitle.textContent = post.title;

            const cardDate = document.createElement('time');
            cardDate.className = 'card-date';
            cardDate.textContent = date;

            const cardExcerpt = document.createElement('p');
            cardExcerpt.className = 'card-excerpt';
            cardExcerpt.textContent = excerpt;

            cardBody.append(tag, cardTitle, cardDate, cardExcerpt);

            const cardFooter = document.createElement('div');
            cardFooter.className = 'card-footer';

            const link = document.createElement('a');
            link.href = `/posts/${post._id}`;
            link.className = 'read-more-btn';
            link.textContent = 'Læs mere \u2192';

            cardFooter.appendChild(link);
            article.append(cardBody, cardFooter);
            blogList.appendChild(article);
        });
    } catch (err) {
        console.error('Error loading posts:', err);
    }
}

async function renderPost(params) {
    showView('post');
    currentPostId = params.id;

    try {
        const response = await fetch(`/api/posts/${params.id}`);
        if (!response.ok) {
            fullPostContent.textContent = 'Indlæg ikke fundet.';
            return;
        }

        const post = await response.json();
        const date = new Date(post.createdAt).toLocaleDateString('da-DK', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        fullPostContent.textContent = '';

        const postTitle = document.createElement('h2');
        postTitle.textContent = post.title;

        const postDate = document.createElement('time');
        postDate.className = 'post-date';
        postDate.textContent = date;

        const postBody = document.createElement('div');
        postBody.innerHTML = post.content;

        fullPostContent.append(postTitle, postDate, postBody);

        // Load existing comments
        await loadComments(params.id);
    } catch (err) {
        console.error('Error loading post:', err);
    }

    // Reset feedback when entering post view
    setFeedback('', null);
}

// --- Comments ---

async function loadComments(postId) {
    commentsList.textContent = '';
    try {
        const response = await fetch(`/api/comments/${postId}`);
        if (!response.ok) return;

        const comments = await response.json();
        comments.forEach((comment) => {
            commentsList.appendChild(renderCommentEl(comment));
        });
    } catch (err) {
        console.error('Error loading comments:', err);
    }
}

function renderCommentEl(comment) {
    const div = document.createElement('div');
    div.className = 'comment-card';

    const header = document.createElement('div');
    header.className = 'comment-header';

    const strong = document.createElement('strong');
    strong.textContent = comment.author || 'Anonym';

    const time = document.createElement('time');
    time.textContent = new Date(comment.createdAt).toLocaleString('da-DK');

    header.append(strong, time);

    const p = document.createElement('p');
    p.textContent = comment.content;

    div.append(header, p);
    return div;
}

// --- URL Extraction ---

function extractUrls(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.match(urlPattern) || [];
}

// --- Comment Form Handling ---

if (commentForm) {
    commentForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!currentPostId) {
            setFeedback('Fejl: Intet indlæg valgt.', 'error');
            return;
        }

        const author = document.getElementById('comment-author').value;
        const text = document.getElementById('comment-text').value;
        const email = document.getElementById('comment-email').value;
        const subscribe = document.getElementById('comment-subscribe').checked;

        // Check URLs before submitting
        const urls = extractUrls(text);
        if (urls.length > 0) {
            setFeedback('Tjekker URL-sikkerhed...', 'loading');
            try {
                const checkResponse = await fetch('/api/validate-urls', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls })
                });
                const checkData = await checkResponse.json();
                const unsafeUrls = checkData.filter((r) => !r.safe);
                if (unsafeUrls.length > 0) {
                    const names = unsafeUrls.map((r) => r.url).join(', ');
                    setFeedback(`Usikre links fundet: ${names}`, 'error');
                    return;
                }
                setFeedback('URLs godkendt! Publicerer...', 'success');
            } catch (err) {
                setFeedback('Fejl ved URL-tjek. Prøv igen.', 'error');
                return;
            }
        }

        setFeedback('Publicerer din kommentar...', 'loading');

        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: currentPostId,
                    author,
                    text,
                    email,
                    subscribe
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setFeedback(data.error || 'Noget gik galt. Prøv igen.', 'error');
                return;
            }

            setFeedback('Din kommentar er publiceret!', 'success');
            commentsList.prepend(renderCommentEl(data));
            commentForm.reset();
        } catch (error) {
            setFeedback('Fejl: Kunne ikke kontakte serveren. Prøv igen senere.', 'error');
            console.error('Comment post error:', error);
        }
    });
}

// --- Initial Load ---
navigateTo(window.location.pathname, false);
