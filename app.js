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

async function showDetails(item) {
    currentItem = item;
    moviesContainer.classList.add('hidden');
    profileView.classList.add('hidden');
    authView.classList.add('hidden');
    detailsView.classList.remove('hidden');

    const displayName = item.title || item.name;
    document.getElementById('detail-poster').src = IMG_URL + item.poster_path;
    document.getElementById('detail-title').innerText = displayName;
    document.getElementById('detail-overview').innerText = item.overview || "Bu içerik için henüz bir açıklama girilmemiş.";
    
    const isTV = item.media_type === 'tv' || !item.release_date;
    const tvSpecArea = document.getElementById('tv-spec-area');
    
    if (isTV) {
        tvSpecArea.classList.remove('hidden');
        await loadSeasonsAndEpisodes(item.id);
    } else {
        tvSpecArea.classList.add('hidden');
    }

    if (currentUser) {
        document.getElementById('review-area').classList.remove('hidden');
        document.getElementById('review-guest-message').classList.add('hidden');
        favoriteBtn.classList.remove('hidden');
        updateFavoriteButtonState();
    } else {
        document.getElementById('review-area').classList.add('hidden');
        document.getElementById('review-guest-message').classList.remove('hidden');
        favoriteBtn.classList.add('hidden');
    }

    updateDetailRating(item.id);
    if (typeof loadComments === 'function') loadComments(item.id); // 4. commit fonksiyonu koruması
}

function updateFavoriteButtonState() {
    if (!currentUser || !currentItem) return;
    let favorites = JSON.parse(localStorage.getItem(`favorites_${currentUser}`)) || [];
    const isFav = favorites.some(fav => fav.id === currentItem.id);
    
    if (isFav) {
        favoriteBtn.innerText = "❤️ Favorilerden Çıkar";
        favoriteBtn.classList.add('is-favorite');
    } else {
        favoriteBtn.innerText = "🤍 Favorilere Ekle";
        favoriteBtn.classList.remove('is-favorite');
    }
}

favoriteBtn.addEventListener('click', () => {
    if (!currentUser || !currentItem) return;
    let favorites = JSON.parse(localStorage.getItem(`favorites_${currentUser}`)) || [];
    const index = favorites.findIndex(fav => fav.id === currentItem.id);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push({
            id: currentItem.id,
            title: currentItem.title,
            name: currentItem.name,
            poster_path: currentItem.poster_path,
            media_type: currentItem.media_type || (currentItem.release_date ? 'movie' : 'tv')
        });
    }

    localStorage.setItem(`favorites_${currentUser}`, JSON.stringify(favorites));
    updateFavoriteButtonState();
});

async function loadSeasonsAndEpisodes(tvId) {
    seasonSelect.innerHTML = '<option value="">Sezon Seçiniz</option>';
    episodeSelect.innerHTML = '<option value="">Önce Sezon Seçiniz</option>';
    episodeSelect.disabled = true;

    try {
        const res = await fetch(`${BASE_URL}/tv/${tvId}?api_key=${API_KEY}&language=tr-TR`);
        const data = await res.json();
        
        if (data && data.seasons) {
            data.seasons.forEach(season => {
                if (season.season_number === 0) return; 
                const opt = document.createElement('option');
                opt.value = season.season_number;
                opt.innerText = `${season.season_number}. Sezon (${season.episode_count} Bölüm)`;
                seasonSelect.appendChild(opt);
            });
        }
    } catch (error) {
        console.error(error);
    }
}

seasonSelect.addEventListener('change', async () => {
    const seasonNumber = seasonSelect.value;
    episodeSelect.innerHTML = '<option value="">Bölüm Seçiniz</option>';
    
    if (!seasonNumber) {
        episodeSelect.innerHTML = '<option value="">Önce Sezon Seçiniz</option>';
        episodeSelect.disabled = true;
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/tv/${currentItem.id}/season/${seasonNumber}?api_key=${API_KEY}&language=tr-TR`);
        const data = await res.json();
        
        if (data && data.episodes) {
            episodeSelect.disabled = false;
            data.episodes.forEach(ep => {
                const opt = document.createElement('option');
                opt.value = ep.episode_number;
                opt.innerText = `${ep.episode_number}. Bölüm - ${ep.name || 'Bölüm Adı Yok'}`;
                episodeSelect.appendChild(opt);
            });
        }
    } catch (error) {
        console.error(error);
    }
});

function updateDetailRating(id) {
    const localAverage = getAverageMovilogRating(id);
    const ratingElement = document.getElementById('detail-movilog-rating');
    if(localAverage) {
        ratingElement.innerHTML = `Kullanıcı Ortalaması: ${generateStarVisual(localAverage)}`;
    } else {
        ratingElement.innerText = "Henüz Movilog puanı verilmemiş.";
    }
}