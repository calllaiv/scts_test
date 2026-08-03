// Плагин SCTS TV для Lampa (ES5-версия, без ошибок)
(function() {
    var notify = function(msg) {
        if (typeof Lampa !== 'undefined' && Lampa.Notify) {
            try {
                Lampa.Notify.show(msg, '', 5000);
            } catch(e) {}
        }
        console.log('[SCTS] ' + msg);
    };

    if (typeof Lampa === 'undefined') {
        notify('❌ Lampa не найдена, повтор через 200мс');
        setTimeout(arguments.callee, 200);
        return;
    }

    notify('🟢 SCTS плагин загружается...');

    var BASE = 'http://online.scts.tv';
    var API = BASE + '/api.php?format=ajax';

    try {
        Lampa.Source.add('scts', {
            name: 'SCTS TV',
            domain: 'online.scts.tv',
            protocol: 'http',

            search: function(query, callback) {
                var url = API + '&action=search&query=' + encodeURIComponent(query);
                notify('🔍 Поиск: ' + query);

                Lampa.Utils.fetch(url, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Referer': BASE + '/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    credentials: 'include'
                })
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status);
                    }
                    return response.text();
                })
                .then(function(text) {
                    var data;
                    try {
                        data = JSON.parse(text);
                    } catch(e) {
                        notify('❌ Ошибка JSON: ' + e.message + '. Текст: ' + text.substring(0, 100));
                        callback([]);
                        return;
                    }
                    var items = [];
                    if (data && data.movies) {
                        for (var i = 0; i < data.movies.length; i++) {
                            var m = data.movies[i];
                            items.push({
                                title: m.name,
                                url: BASE + '#/movie/id/' + m.movie_id,
                                id: String(m.movie_id),
                                type: 'movie'
                            });
                        }
                        notify('✅ Найдено: ' + items.length);
                    } else {
                        notify('⚠️ Нет фильмов в ответе');
                    }
                    callback(items);
                })
                .catch(function(e) {
                    notify('❌ Ошибка поиска: ' + e.message);
                    callback([]);
                });
            },

            getStream: function(item, callback) {
                var url = API + '&action=getMovie&movie_id=' + encodeURIComponent(item.id);
                notify('🎬 Запрос потока: ' + item.id);

                Lampa.Utils.fetch(url, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Referer': BASE + '/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    credentials: 'include'
                })
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status);
                    }
                    return response.text();
                })
                .then(function(text) {
                    var data;
                    try {
                        data = JSON.parse(text);
                    } catch(e) {
                        notify('❌ Ошибка JSON в потоке: ' + e.message);
                        callback(null);
                        return;
                    }
                    var movie = data.movie;
                    if (!movie || !movie.files) {
                        notify('⚠️ Нет файлов');
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
                                    notify('🎥 Найдено: ' + key);
                                    break;
                                }
                            }
                            if (streamUrl) {
                                break;
                            }
                        }
                    }
                    if (streamUrl) {
                        callback({
                            url: streamUrl,
                            quality: 'unknown'
                        });
                    } else {
                        notify('❌ Поток не найден');
                        callback(null);
                    }
                })
                .catch(function(e) {
                    notify('❌ Ошибка getStream: ' + e.message);
                    callback(null);
                });
            }
        });
        notify('✅ Плагин SCTS TV успешно зарегистрирован!');
    } catch(e) {
        notify('❌ Критическая ошибка: ' + e.message);
    }
})();            })
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
