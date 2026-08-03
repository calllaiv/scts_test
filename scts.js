// SCTS TV — регистрация через Lampa.Search
(function() {
    var show = function(msg) {
        if (typeof Lampa !== 'undefined' && Lampa.Notify) {
            try { Lampa.Notify.show(msg, '', 5000); } catch(e) {}
        }
        console.log('[SCTS] ' + msg);
    };

    var attempts = 0;
    var maxAttempts = 10;

    var register = function() {
        if (typeof Lampa === 'undefined') {
            setTimeout(register, 200);
            return;
        }
        if (typeof Lampa.Search === 'undefined' || typeof Lampa.Search.addSource !== 'function') {
            attempts++;
            if (attempts >= maxAttempts) {
                show('❌ Lampa.Search.addSource не найден. Попытки: ' + attempts);
                tryAlternative();
                return;
            }
            show('⏳ Ожидание Lampa.Search.addSource... попытка ' + attempts);
            setTimeout(register, 200);
            return;
        }
        // Если Lampa.Search.addSource доступен, регистрируем
        doRegister();
    };

    var tryAlternative = function() {
        show('⚠️ Пробуем альтернативные способы...');
        var sourceObj = createSourceObj();
        // Пробуем добавить в Lampa.Plugins (как плагин)
        if (typeof Lampa.Plugins !== 'undefined' && typeof Lampa.Plugins.add === 'function') {
            try {
                Lampa.Plugins.add('scts', sourceObj);
                show('✅ Добавлен в Lampa.Plugins');
            } catch(e) { show('❌ Ошибка Lampa.Plugins.add: ' + e.message); }
        }
        // Пробуем добавить напрямую в Lampa.Search.sources
        if (Lampa.Search && Lampa.Search.sources) {
            Lampa.Search.sources.scts = sourceObj;
            show('✅ Добавлен в Lampa.Search.sources напрямую');
        }
        // Пробуем Lampa.Controller.addSource, если есть
        if (Lampa.Controller && typeof Lampa.Controller.addSource === 'function') {
            try {
                Lampa.Controller.addSource('scts', sourceObj);
                show('✅ Добавлен в Lampa.Controller');
            } catch(e) { show('❌ Ошибка Lampa.Controller.addSource: ' + e.message); }
        }
        // Проверим результат через секунду
        setTimeout(function() {
            var found = false;
            if (Lampa.Search.sources && Lampa.Search.sources.scts) {
                found = true;
                show('🎉 Источник появился в Lampa.Search.sources! Перезапустите Lampa.');
            }
            if (!found) {
                show('⚠️ Источник не найден. Доступные ключи Lampa.Search: ' + Object.keys(Lampa.Search).join(', '));
                if (Lampa.Search.sources) {
                    show('📋 Lampa.Search.sources: ' + Object.keys(Lampa.Search.sources).join(', '));
                }
            }
        }, 1000);
    };

    var createSourceObj = function() {
        var BASE = 'http://online.scts.tv';
        var API = BASE + '/api.php?format=ajax';
        return {
            name: 'SCTS TV',
            domain: 'online.scts.tv',
            protocol: 'http',
            search: function(query, callback) {
                var url = API + '&action=search&query=' + encodeURIComponent(query);
                show('🔍 Поиск: ' + query);
                Lampa.Utils.fetch(url, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'include'
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
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
                    }
                    show('✅ Найдено: ' + items.length);
                    callback(items);
                })
                .catch(function(e) {
                    show('❌ Ошибка поиска: ' + (e.message || e));
                    callback([]);
                });
            },
            getStream: function(item, callback) {
                var url = API + '&action=getMovie&movie_id=' + encodeURIComponent(item.id);
                show('🎬 Запрос потока: ' + item.id);
                Lampa.Utils.fetch(url, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'include'
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    var movie = data.movie;
                    if (!movie || !movie.files) { show('⚠️ Нет файлов'); callback(null); return; }
                    var priorities = ['1080p', '720p', '480p', '360p'];
                    var streamUrl = null;
                    for (var i = 0; i < movie.files.length; i++) {
                        var file = movie.files[i];
                        if (file.active && file.links && file.links.streams) {
                            for (var q = 0; q < priorities.length; q++) {
                                var key = priorities[q];
                                if (file.links.streams[key]) {
                                    streamUrl = file.links.streams[key];
                                    show('🎥 Найдено качество: ' + key);
                                    break;
                                }
                            }
                            if (streamUrl) break;
                        }
                    }
                    if (streamUrl) {
                        callback({ url: streamUrl, quality: 'unknown' });
                    } else {
                        show('❌ Поток не найден');
                        callback(null);
                    }
                })
                .catch(function(e) {
                    show('❌ Ошибка getStream: ' + (e.message || e));
                    callback(null);
                });
            }
        };
    };

    var doRegister = function() {
        var sourceObj = createSourceObj();
        try {
            Lampa.Search.addSource('scts', sourceObj);
            show('✅ Источник добавлен через Lampa.Search.addSource');
            // Попробуем обновить интерфейс
            if (typeof Lampa.Search.open === 'function') {
                Lampa.Search.open();
            }
            if (typeof Lampa.Search.render === 'function') {
                Lampa.Search.render();
            }
            // Проверим, появился ли источник
            setTimeout(function() {
                if (Lampa.Search.sources && Lampa.Search.sources.scts) {
                    show('🎉 Источник SCTS TV теперь доступен в поиске! Перезапустите Lampa, если не видно.');
                } else {
                    show('⚠️ Источник не появился в Lampa.Search.sources. Попробуйте перезапустить Lampa.');
                }
            }, 500);
        } catch(e) {
            show('❌ Ошибка Lampa.Search.addSource: ' + e.message);
            tryAlternative();
        }
    };

    register();
})();
