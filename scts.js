// Плагин SCTS TV для Lampa (финальная версия)
(function() {
    if (typeof Lampa === 'undefined') {
        setTimeout(arguments.callee, 200);
        return;
    }

    var BASE = 'http://online.scts.tv';
    var API = BASE + '/api.php?format=ajax';

    Lampa.Source.add('scts', {
        name: 'SCTS TV',
        domain: 'online.scts.tv',
        protocol: 'http',

        search: function(query, callback) {
            var url = API + '&action=search&query=' + encodeURIComponent(query);
            Lampa.Utils.fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'include'
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var items = [];
                if (data && data.movies) {
                    data.movies.forEach(function(m) {
                        items.push({
                            title: m.name,
                            url: BASE + '#/movie/id/' + m.movie_id,
                            id: String(m.movie_id),
                            type: 'movie'
                        });
                    });
                }
                callback(items);
            })
            .catch(function(e) {
                console.error('[SCTS] Ошибка поиска:', e);
                callback([]);
            });
        },

        getStream: function(item, callback) {
            var url = API + '&action=getMovie&movie_id=' + encodeURIComponent(item.id);
            Lampa.Utils.fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'include'
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var movie = data.movie;
                if (!movie || !movie.files) {
                    callback(null);
                    return;
                }
                var priorities = ['1080p', '720p', '480p', '360p'];
                var streamUrl = null;
                for (var i = 0; i < movie.files.length; i++) {
                    var file = movie.files[i];
                    if (file.active && file.links && file.links.streams) {
                        for (var q = 0; q < priorities.length; q++) {
                            var key = priorities[q];
                            if (file.links.streams[key]) {
                                streamUrl = file.links.streams[key];
                                break;
                            }
                        }
                        if (streamUrl) break;
                    }
                }
                if (streamUrl) {
                    callback({ url: streamUrl, quality: 'unknown' });
                } else {
                    callback(null);
                }
            })
            .catch(function(e) {
                console.error('[SCTS] Ошибка получения потока:', e);
                callback(null);
            });
        }
    });

    console.log('✅ SCTS TV плагин загружен');
})();                            title: movie.name,
                            url: BASE + '#/movie/id/' + movie.movie_id,
                            id: String(movie.movie_id),
                            type: 'movie'
                        });
                    });
                }
                callback(items);
            })
            .catch(function(err) {
                console.error('[SCTS] search error:', err);
                callback([]);
            });
        },

        // ----- Получение видео -----
        getStream: function(item, callback) {
            var movieId = item.id;
            var url = API + '&action=getMovie&movie_id=' + encodeURIComponent(movieId);

            Lampa.Utils.fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                var movie = data.movie;
                if (!movie || !movie.files) {
                    callback(null);
                    return;
                }

                var priorities = ['1080p', '720p', '480p', '360p'];
                var streamUrl = null;

                for (var i = 0; i < movie.files.length; i++) {
                    var file = movie.files[i];
                    if (file.active && file.links && file.links.streams) {
                        for (var q = 0; q < priorities.length; q++) {
                            var key = priorities[q];
                            if (file.links.streams[key]) {
                                streamUrl = file.links.streams[key];
                                break;
                            }
                        }
                        if (streamUrl) break;
                    }
                }

                if (streamUrl) {
                    callback({
                        url: streamUrl,
                        quality: 'unknown'
                    });
                } else {
                    callback(null);
                }
            })
            .catch(function(err) {
                console.error('[SCTS] getStream error:', err);
                callback(null);
            });
        }
    });

    console.log('✅ SCTS TV плагин загружен');
})();
