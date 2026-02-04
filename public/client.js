// --- DOM Elements (Vi griber fat i HTML-elementerne) ---
// Vi bruger 'const', fordi referencen til elementet ikke ændrer sig.

// Views
const viewHome = document.getElementById('view-home');
const viewPost = document.getElementById('view-post');

// Buttons 
const btnHome = document.getElementById('btn-home');
const btnBack = document.getElementById('back-btn');
const btnReadMore = document.querySelector('.read-more-btn');


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
if (btnReadMore) {
    btnReadMore.addEventListener('click', () => {
        goToPost();
    });
}