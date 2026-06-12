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

// --- 4. Commit Kodları ---
document.getElementById('review-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const rating = document.getElementById('user-rating').value;
    const comment = document.getElementById('user-comment').value;
    const watchDateInput = document.getElementById('watch-date').value;
    
    const formattedWatchDate = new Date(watchDateInput).toLocaleDateString('tr-TR');
    const reviewDate = new Date().toLocaleDateString('tr-TR');

    let contentSuffix = "";
    if (!seasonSelect.disabled && seasonSelect.value) {
        contentSuffix += ` - S${seasonSelect.value}`;
        if (episodeSelect.value) {
            contentSuffix += `E${episodeSelect.value}`;
        }
    }

    const review = {
        id: currentItem.id,
        timestamp: Date.now(),
        user: currentUser,
        title: (currentItem.title || currentItem.name) + contentSuffix,
        poster: currentItem.poster_path,
        rating,
        comment,
        watchDate: formattedWatchDate,
        reviewDate
    };
    
    let itemReviews = JSON.parse(localStorage.getItem(`reviews_${currentItem.id}`)) || [];
    itemReviews.push(review);
    localStorage.setItem(`reviews_${currentItem.id}`, JSON.stringify(itemReviews));

    let userHistory = JSON.parse(localStorage.getItem(`history_${currentUser}`)) || [];
    userHistory.push(review);
    localStorage.setItem(`history_${currentUser}`, JSON.stringify(userHistory));

    document.getElementById('review-form').reset();
    seasonSelect.value = "";
    episodeSelect.innerHTML = '<option value="">Önce Sezon Seçiniz</option>';
    episodeSelect.disabled = true;
    
    loadComments(currentItem.id);
    updateDetailRating(currentItem.id);
});

function loadComments(id) {
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = '';
    const reviews = JSON.parse(localStorage.getItem(`reviews_${id}`)) || [];

    if(reviews.length === 0) {
        commentsList.innerHTML = '<p style="color: #aaa; font-size: 14px;">Henüz yorum yapılmamış. İlk yorumu sen yap!</p>';
        return;
    }

    reviews.forEach(rev => {
        const div = document.createElement('div');
        div.classList.add('comment-item');
        
        let actionButtonsHtml = '';
        if (currentUser && rev.user === currentUser) {
            actionButtonsHtml = `
                <div class="comment-actions">
                    <button class="edit-review-btn">Düzenle</button>
                    <button class="delete-review-btn">Sil</button>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="comment-content-wrapper">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: #a78bfa;">${generateStarVisual(rev.rating)}</strong>
                    <span class="comment-author" style="font-size: 14px; color: #ec4899; cursor: pointer; font-weight:600;">👤 ${rev.user}</span>
                </div>
                <p style="margin: 8px 0 4px 0; color: #cbd5e1; font-size: 14px;">${rev.comment}</p>
                <div style="display: flex; gap: 15px; font-size: 11px; color: #64748b; margin-top: 5px;">
                    <span>👁️ İzleme Tarihi: ${rev.watchDate}</span>
                    <span>✍️ Yorum Tarihi: ${rev.reviewDate}</span>
                </div>
                ${actionButtonsHtml}
            </div>
        `;
        
        div.querySelector('.comment-author').addEventListener('click', () => {
            showUserProfile(rev.user);
        });

        if (currentUser && rev.user === currentUser) {
            div.querySelector('.edit-review-btn').addEventListener('click', () => startInlineEdit(div.querySelector('.comment-content-wrapper'), rev, 'item', id));
            div.querySelector('.delete-review-btn').addEventListener('click', () => deleteReview(rev.id, rev.user, rev.timestamp));
        }
        
        commentsList.appendChild(div);
    });
}

function startInlineEdit(container, rev, type, targetId) {
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; background: rgba(255,255,255,0.02); padding: 5px; border-radius: 8px;">
            <select class="edit-rating" style="width: 100%; padding: 10px; background: #1e1b4b; color: white; border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 8px;">
                <option value="5" ${rev.rating === '5' ? 'selected' : ''}>⭐⭐⭐⭐⭐ (5)</option>
                <option value="4" ${rev.rating === '4' ? 'selected' : ''}>⭐⭐⭐⭐ (4)</option>
                <option value="3" ${rev.rating === '3' ? 'selected' : ''}>⭐⭐⭐ (3)</option>
                <option value="2" ${rev.rating === '2' ? 'selected' : ''}>⭐⭐ (2)</option>
                <option value="1" ${rev.rating === '1' ? 'selected' : ''}>⭐ (1)</option>
            </select>
            <textarea class="edit-comment" style="width: 100%; height: 80px; padding: 10px; background: #1e1b4b; color: white; border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 8px; resize: none;">${rev.comment}</textarea>
            <div style="display: flex; gap: 10px;">
                <button class="save-edit-btn" style="background: linear-gradient(90deg, #a855f7, #ec4899); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">Kaydet</button>
                <button class="cancel-edit-btn" style="background: rgba(255,255,255,0.08); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 8px; cursor: pointer;">İptal</button>
            </div>
        </div>
    `;

    container.querySelector('.save-edit-btn').addEventListener('click', () => {
        const newRating = container.querySelector('.edit-rating').value;
        const newComment = container.querySelector('.edit-comment').value.trim();
        if (!newComment) return;

        let itemReviews = JSON.parse(localStorage.getItem(`reviews_${rev.id}`)) || [];
        itemReviews.forEach(r => {
            if (r.timestamp === rev.timestamp) {
                r.comment = newComment;
                r.rating = newRating;
            }
        });
        localStorage.setItem(`reviews_${rev.id}`, JSON.stringify(itemReviews));

        let userHistory = JSON.parse(localStorage.getItem(`history_${rev.user}`)) || [];
        userHistory.forEach(r => {
            if (r.id === rev.id && r.timestamp === rev.timestamp) {
                r.comment = newComment;
                r.rating = newRating;
            }
        });
        localStorage.setItem(`history_${rev.user}`, JSON.stringify(userHistory));

        if (type === 'item') {
            loadComments(targetId);
            updateDetailRating(targetId);
        } else {
            loadProfileReviews(targetId);
        }
    });

    container.querySelector('.cancel-edit-btn').addEventListener('click', () => {
        if (type === 'item') {
            loadComments(targetId);
        } else {
            loadProfileReviews(targetId);
        }
    });
}

function deleteReview(id, user, timestamp) {
    if (!confirm("Yorumunuzu silmek istediğinize emin misiniz?")) return;

    let itemReviews = JSON.parse(localStorage.getItem(`reviews_${id}`)) || [];
    itemReviews = itemReviews.filter(r => r.timestamp !== timestamp);
    localStorage.setItem(`reviews_${id}`, JSON.stringify(itemReviews));

    let userHistory = JSON.parse(localStorage.getItem(`history_${user}`)) || [];
    userHistory = userHistory.filter(r => r.timestamp !== timestamp);
    localStorage.setItem(`history_${user}`, JSON.stringify(userHistory));

    if (!detailsView.classList.contains('hidden') && currentItem && currentItem.id === id) {
        loadComments(id);
        updateDetailRating(id);
    }
    if (!profileView.classList.contains('hidden') && viewedProfileUser) {
        loadProfileReviews(viewedProfileUser);
    }
}

function showUserProfile(username) {
    viewedProfileUser = username;
    moviesContainer.classList.add('hidden');
    detailsView.classList.add('hidden');
    authView.classList.add('hidden');
    profileView.classList.remove('hidden');

    if (username === currentUser) {
        document.getElementById('profile-title').innerText = `Profilim (${currentUser})`;
        addFriendBtn.classList.add('hidden');
        document.getElementById('profile-friends-section').classList.remove('hidden');
    } else {
        document.getElementById('profile-title').innerText = `${username} adlı kullanıcının profili`;
        document.getElementById('profile-friends-section').classList.add('hidden');
        
        if (currentUser) {
            addFriendBtn.classList.remove('hidden');
            updateFriendButtonState();
        } else {
            addFriendBtn.classList.add('hidden');
        }
    }
    
    loadProfileFavorites(username);
    loadProfileReviews(username);
    loadFriendsList();
}

function loadProfileFavorites(username) {
    const favoritesList = document.getElementById('profile-favorites-list');
    favoritesList.innerHTML = '';
    let favorites = JSON.parse(localStorage.getItem(`favorites_${username}`)) || [];

    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p style="color: #aaa; font-size: 14px;">Henüz favori eklenmemiş.</p>';
        return;
    }

    favorites.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('favorite-item-card');
        const displayName = item.title || item.name;
        card.innerHTML = `
            <img src="${IMG_URL + item.poster_path}" alt="${displayName}">
            <h4>${displayName}</h4>
        `;
        card.addEventListener('click', () => {
            showDetails(item);
        });
        favoritesList.appendChild(card);
    });
}

function updateFriendButtonState() {
    if (!currentUser) return;
    let friends = JSON.parse(localStorage.getItem(`friends_${currentUser}`)) || [];
    if (friends.includes(viewedProfileUser)) {
        addFriendBtn.innerText = "✓ Arkadaşsınız";
        addFriendBtn.classList.add('is-friend');
    } else {
        addFriendBtn.innerText = "Arkadaş Ekle";
        addFriendBtn.classList.remove('is-friend');
    }
}

addFriendBtn.addEventListener('click', () => {
    if (!currentUser) return;
    let friends = JSON.parse(localStorage.getItem(`friends_${currentUser}`)) || [];
    
    if (friends.includes(viewedProfileUser)) {
        friends = friends.filter(f => f !== viewedProfileUser);
        localStorage.setItem(`friends_${currentUser}`, JSON.stringify(friends));
    } else {
        friends.push(viewedProfileUser);
        localStorage.setItem(`friends_${currentUser}`, JSON.stringify(friends));
    }
    updateFriendButtonState();
    loadFriendsList();
});

function loadProfileReviews(username) {
    const profileReviewsList = document.getElementById('profile-reviews-list');
    profileReviewsList.innerHTML = '';
    const history = JSON.parse(localStorage.getItem(`history_${username}`)) || [];

    if(history.length === 0) {
        profileReviewsList.innerHTML = '<p style="color: #aaa; font-size: 14px;">Henüz hiçbir içeriğe yorum yapıp puan vermedi.</p>';
        return;
    }

    history.forEach(rev => {
        const card = document.createElement('div');
        card.classList.add('profile-review-card');
        
        let actionButtonsHtml = '';
        if (currentUser && username === currentUser) {
            actionButtonsHtml = `
                <div class="comment-actions">
                    <button class="edit-review-btn">Düzenle</button>
                    <button class="delete-review-btn">Sil</button>
                </div>
            `;
        }

        card.innerHTML = `
            <img src="${IMG_URL + rev.poster}" alt="${rev.title}" style="cursor:pointer;">
            <div style="flex: 1;" class="profile-content-wrapper">
                <h4 class="review-item-title" style="font-size: 18px; color: #fff; margin-bottom: 5px; cursor:pointer;">${rev.title}</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 5px; font-size: 13px;">
                    <span style="color: #a78bfa;">${generateStarVisual(rev.rating)}</span>
                    <span style="color: #64748b;">👁️ İzleme: ${rev.watchDate}</span>
                    <span style="color: #64748b;">✍️ Yorum: ${rev.reviewDate}</span>
                </div>
                <p style="color: #cbd5e1; font-size: 14px; margin-top: 5px;">"${rev.comment}"</p>
                ${actionButtonsHtml}
            </div>
        `;

        const targetItemFetcher = async () => {
            try {
                const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(rev.title.split(' - ')[0])}&language=tr-TR`);
                const data = await res.json();
                if (data && data.results && data.results[0]) {
                    showDetails(data.results[0]);
                }
            } catch (e) {
                console.error(e);
            }
        };

        card.querySelector('img').addEventListener('click', targetItemFetcher);
        card.querySelector('.review-item-title').addEventListener('click', targetItemFetcher);

        if (currentUser && username === currentUser) {
            card.querySelector('.edit-review-btn').addEventListener('click', () => startInlineEdit(card.querySelector('.profile-content-wrapper'), rev, 'profile', username));
            card.querySelector('.delete-review-btn').addEventListener('click', () => deleteReview(rev.id, username, rev.timestamp));
        }

        profileReviewsList.appendChild(card);
    });
}

function loadFriendsList() {
    const friendsList = document.getElementById('profile-friends-list');
    const friendCount = document.getElementById('friend-count');
    friendsList.innerHTML = '';
    
    if (!currentUser) return;
    let friends = JSON.parse(localStorage.getItem(`friends_${currentUser}`)) || [];
    friendCount.innerText = friends.length;

    if (friends.length === 0) {
        friendsList.innerHTML = '<p style="color: #64748b; font-size: 13px;">Henüz arkadaş eklenmemiş.</p>';
        return;
    }

    friends.forEach(friend => {
        const item = document.createElement('div');
        item.classList.add('friend-item');
        item.innerText = `👤 ${friend}`;
        item.addEventListener('click', () => {
            showUserProfile(friend);
        });
        friendsList.appendChild(item);
    });
}

authNavBtn.addEventListener('click', () => {
    moviesContainer.classList.add('hidden');
    detailsView.classList.add('hidden');
    profileView.classList.add('hidden');
    authView.classList.remove('hidden');
    document.getElementById('auth-message').innerText = '';
});

const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    document.getElementById('auth-message').innerText = '';
});

tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    document.getElementById('auth-message').innerText = '';
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('register-username').value.trim();
    const pass = document.getElementById('register-password').value;
    const msg = document.getElementById('auth-message');

    let users = JSON.parse(localStorage.getItem('registered_users')) || {};

    if (users[user]) {
        msg.innerText = 'Bu kullanıcı adı zaten alınmış!';
        return;
    }

    users[user] = pass;
    localStorage.setItem('registered_users', JSON.stringify(users));
    msg.style.color = '#10b981';
    msg.innerText = 'Kayıt başarılı! Giriş yapabilirsiniz.';
    registerForm.reset();
    tabLogin.click();
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    const msg = document.getElementById('auth-message');

    let users = JSON.parse(localStorage.getItem('registered_users')) || {};

    if (!users[user] || users[user] !== pass) {
        msg.style.color = '#ec4899';
        msg.innerText = 'Hatalı kullanıcı adı veya şifre!';
        return;
    }

    currentUser = user;
    localStorage.setItem('current_user', currentUser);
    updateNavbar();
    loginForm.reset();
    goBackToHome();
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('current_user');
    updateNavbar();
    goBackToHome();
});

profileBtn.addEventListener('click', () => {
    if (currentUser) {
        showUserProfile(currentUser);
    }
});

updateNavbar();
getMovies();