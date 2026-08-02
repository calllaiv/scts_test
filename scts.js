// Плагин "SCTS TV" для Lampa (через API)
(function() {
    if (typeof Lampa === 'undefined') {
        setTimeout(arguments.callee, 100);
        return;
    }

    var BASE = 'http://online.scts.tv';
    var API = BASE + '/api.php?format=ajax';

    Lampa.Source.add('scts', {
        name: 'SCTS TV',
        domain: 'online.scts.tv',
        protocol: 'http',

        // ------ Поиск фильмов ------
        search: function(query, callback) {
            var url = API + '&action=search&query=' + encodeURIComponent(query);

            fetch(url, {
                credentials: 'include',      // передаём куки сайта
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var items = [];
                if (data && data.movies) {
                    data.movies.forEach(function(movie) {
                        items.push({
                            title: movie.name,
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

        // ------ Получение ссылки на видео ------
        getStream: function(item, callback) {
            var movieId = item.id;
            var url = API + '&action=getMovie&movie_id=' + encodeURIComponent(movieId);

            fetch(url, {
                credentials: 'include',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var movie = data.movie;
                if (!movie || !movie.files) {
                    callback(null);
                    return;
                }

                // Приоритет качеств (сверху вниз)
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

    console.log('✅ Плагин SCTS TV загружен');
})();
