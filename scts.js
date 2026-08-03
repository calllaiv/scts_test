// SCTS TV — диагностическая версия с принудительной регистрацией
(function() {
    // Функция для показа уведомлений
    var show = function(msg) {
        if (typeof Lampa !== 'undefined' && Lampa.Notify) {
            try { Lampa.Notify.show(msg, '', 5000); } catch(e) {}
        }
        console.log('[SCTS] ' + msg);
    };

    // Ждём Lampa
    if (typeof Lampa === 'undefined') {
        setTimeout(arguments.callee, 200);
        return;
    }

    show('🟢 Lampa найдена, ждём Source...');

    // Ждём Lampa.Source
    if (!Lampa.Source) {
        setTimeout(arguments.callee, 200);
        return;
    }

    show('🔧 Lampa.Source существует, регистрируем...');

    var BASE = 'http://online.scts.tv';
    var API = BASE + '/api.php?format=ajax';

    // Объект источника
    var sourceObj = {
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

    // Пытаемся зарегистрировать стандартным способом
    var registered = false;
    if (typeof Lampa.Source.add === 'function') {
        try {
            Lampa.Source.add('scts', sourceObj);
            registered = true;
            show('✅ Регистрация через add() выполнена');
        } catch(e) {
            show('❌ Ошибка add(): ' + e.message);
        }
    } else {
        show('⚠️ Lampa.Source.add не функция');
    }

    // Если стандартный способ не сработал, пробуем вручную добавить в список
    if (!registered) {
        try {
            if (!Lampa.Source.sources) Lampa.Source.sources = {};
            Lampa.Source.sources['scts'] = sourceObj;
            show('✅ Источник добавлен вручную в sources');
            registered = true;
        } catch(e) {
            show('❌ Ошибка ручного добавления: ' + e.message);
        }
    }

    // Проверяем, появился ли источник
    if (registered) {
        var check = Lampa.Source.sources && Lampa.Source.sources['scts'];
        if (check) {
            show('🎉 Источник SCTS TV успешно зарегистрирован! Перезапустите Lampa, если не видно.');
        } else {
            show('⚠️ Источник не найден в sources после регистрации');
        }
    } else {
        show('❌ Регистрация не удалась');
    }
})();
