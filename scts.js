// SCTS TV — финальная версия с ограничением попыток и диагностикой
(function() {
    var attempts = 0;
    var maxAttempts = 10;

    var show = function(msg) {
        if (typeof Lampa !== 'undefined' && Lampa.Notify) {
            try { Lampa.Notify.show(msg, '', 5000); } catch(e) {}
        }
        console.log('[SCTS] ' + msg);
    };

    var register = function() {
        // Если Lampa ещё не загружена
        if (typeof Lampa === 'undefined') {
            show('❌ Lampa не определена');
            return;
        }

        // Если Lampa.Source есть — используем его
        if (typeof Lampa.Source !== 'undefined' && Lampa.Source) {
            show('✅ Lampa.Source найден, регистрируем...');
            doRegister(Lampa.Source);
            return;
        }

        // Если нет — пробуем другие пути
        attempts++;
        if (attempts >= maxAttempts) {
            show('❌ Lampa.Source не появился за ' + maxAttempts + ' попыток. Пробуем альтернативы...');
            // Пробуем найти другие возможные ключи
            if (typeof Lampa.Plugins !== 'undefined' && Lampa.Plugins) {
                show('🔍 Найден Lampa.Plugins, пробуем добавить через него...');
                // Предположим, что там есть метод addSource
                if (typeof Lampa.Plugins.addSource === 'function') {
                    doRegister(Lampa.Plugins);
                } else {
                    show('⚠️ Lampa.Plugins.addSource не функция. Смотрим содержимое Lampa...');
                    show('📋 Доступные ключи Lampa: ' + Object.keys(Lampa).join(', '));
                }
            } else {
                show('⚠️ Lampa.Plugins не найден. Доступные ключи Lampa: ' + Object.keys(Lampa).join(', '));
            }
            return;
        }

        show('⏳ Ожидание Lampa.Source... попытка ' + attempts);
        setTimeout(register, 200);
    };

    // Функция регистрации
    var doRegister = function(container) {
        var BASE = 'http://online.scts.tv';
        var API = BASE + '/api.php?format=ajax';

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

        // Пытаемся зарегистрировать
        var key = 'scts';
        if (typeof container.add === 'function') {
            try {
                container.add(key, sourceObj);
                show('✅ Регистрация через add() выполнена');
            } catch(e) {
                show('❌ Ошибка add(): ' + e.message);
                // Пробуем добавить напрямую в хранилище
                if (container.sources) {
                    container.sources[key] = sourceObj;
                    show('✅ Добавлено в sources вручную');
                }
            }
        } else if (container.sources) {
            container.sources[key] = sourceObj;
            show('✅ Добавлено в sources (метод add отсутствует)');
        } else {
            show('❌ Неизвестный контейнер, не удалось зарегистрировать');
        }

        // Дополнительная проверка
        var check = (container.sources && container.sources[key]) || (container[key]);
        if (check) {
            show('🎉 Источник SCTS TV зарегистрирован! Перезапустите Lampa.');
        } else {
            show('⚠️ Регистрация прошла, но источник не найден в контейнере.');
        }
    };

    // Запускаем процесс регистрации
    register();
})();
