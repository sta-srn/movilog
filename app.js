const API_KEY = 'f2ad58016d5e953f7d48d0e250dfa91a'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

const moviesContainer = document.getElementById('movies-container');
const detailsView = document.getElementById('details-view');
const profileView = document.getElementById('profile-view');
const authView = document.getElementById('auth-view');
const searchInput = document.getElementById('search');

const profileBtn = document.getElementById('profile-btn');
const logoutBtn = document.getElementById('logout-btn');
const authNavBtn = document.getElementById('auth-nav-btn');
const addFriendBtn = document.getElementById('add-friend-btn');
const favoriteBtn = document.getElementById('favorite-btn');

const seasonSelect = document.getElementById('season-select');
const episodeSelect = document.getElementById('episode-select');

let currentItem = null;
let currentUser = localStorage.getItem('current_user') || null;
let viewedProfileUser = null;

function updateNavbar() {
    if (currentUser) {
        profileBtn.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        authNavBtn.classList.add('hidden');
    } else {
        profileBtn.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        authNavBtn.classList.remove('hidden');
    }
}

function generateStarVisual(rating) {
    const ratingNum = parseFloat(rating);
    if (isNaN(ratingNum)) return 'Henüz Puanlanmadı';
    
    let starsVisual = '';
    const fullStars = Math.floor(ratingNum);
    const hasHalf = ratingNum % 1 !== 0;

    starsVisual += '⭐'.repeat(fullStars);
    if (hasHalf) starsVisual += '🌗';
    return `${starsVisual} (${ratingNum}/5)`;
}

function getAverageMovilogRating(id) {
    const reviews = JSON.parse(localStorage.getItem(`reviews_${id}`)) || [];
    if (reviews.length === 0) return null;

    const total = reviews.reduce((sum, rev) => sum + parseFloat(rev.rating), 0);
    return (total / reviews.length).toFixed(1);
}

function goBackToHome() {
    detailsView.classList.add('hidden');
    profileView.classList.add('hidden');
    authView.classList.add('hidden');
    moviesContainer.classList.remove('hidden');
    getMovies(); // 2. commit ile eklenecek
}

document.getElementById('back-btn').addEventListener('click', goBackToHome);
document.getElementById('profile-back-btn').addEventListener('click', goBackToHome);
document.getElementById('logo').addEventListener('click', () => {
    searchInput.value = '';
    goBackToHome();
});

// --- 2. Commit Kodları ---
async function getMovies() {
    try {
        const res = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=tr-TR`);
        const data = await res.json();
        if (data && data.results) {
            displayMovies(data.results);
        }
    } catch (error) {
        console.error(error);
    }
}

function displayMovies(movies) {
    moviesContainer.innerHTML = '';
    if (!movies || !Array.isArray(movies)) return;

    movies.forEach(item => {
        if (!item.poster_path) return;

        const localAverage = getAverageMovilogRating(item.id);
        const displayRating = localAverage ? `Movilog: ${localAverage}/5` : `TMDB: ${(item.vote_average / 2).toFixed(1)}/5`;
        const displayName = item.title || item.name;

        const movieCard = document.createElement('div');
        movieCard.classList.add('movie-card');
        movieCard.innerHTML = `
            <img src="${IMG_URL + item.poster_path}" alt="${displayName}">
            <h3>${displayName}</h3>
            <p>⭐ ${displayRating}</p>
        `;
        movieCard.addEventListener('click', () => showDetails(item)); // 3. commit ile canlanacak
        moviesContainer.appendChild(movieCard);
    });
}

searchInput.addEventListener('keyup', async (e) => {
    const query = e.target.value.trim();
    if (!query) { getMovies(); return; }

    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=tr-TR`);
        const data = await res.json();
        if (data && data.results) {
            displayMovies(data.results);
        }
    } catch (error) {
        console.error(error);
    }
});