// SCTS TV — универсальная регистрация для Media Station X
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
        if (typeof Lampa === 'undefined') {
            show('❌ Lampa не определена');
            return;
        }

        // Если есть Lampa.Source — используем его (на случай, если он появится позже)
        if (typeof Lampa.Source !== 'undefined' && Lampa.Source) {
            show('✅ Lampa.Source найден, регистрируем...');
            doRegister(Lampa.Source);
            return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
            show('⏳ Lampa.Source не появился. Ищем альтернативы...');
            // Пробуем другие способы
            tryAlternative();
            return;
        }

        show('⏳ Ожидание Lampa.Source... попытка ' + attempts);
        setTimeout(register, 200);
    };

    var tryAlternative = function() {
        show('🔍 Пробуем зарегистрировать через Lampa.Plugins...');

        // 1. Пробуем Lampa.Plugins
        if (typeof Lampa.Plugins !== 'undefined' && Lampa.Plugins) {
            show('🔧 Lampa.Plugins найден. Доступные методы: ' + Object.keys(Lampa.Plugins).join(', '));
            // Проверяем наличие метода add или register
            if (typeof Lampa.Plugins.add === 'function') {
                show('➕ Пробуем Lampa.Plugins.add');
                doRegister(Lampa.Plugins);
                return;
            }
            if (typeof Lampa.Plugins.register === 'function') {
                show('➕ Пробуем Lampa.Plugins.register');
                doRegister(Lampa.Plugins);
                return;
            }
            // Если методов нет, пробуем добавить напрямую в объект
            show('⚠️ Методы add/register не найдены. Добавляем в Lampa.Plugins.scts');
            Lampa.Plugins.scts = createSourceObj();
            show('✅ Добавлено в Lampa.Plugins.scts');
            checkResult();
            return;
        }

        // 2. Пробуем Lampa.Search
        if (typeof Lampa.Search !== 'undefined' && Lampa.Search) {
            show('🔧 Lampa.Search найден. Доступные ключи: ' + Object.keys(Lampa.Search).join(', '));
            // Возможно, есть свойство sources или providers
            if (Lampa.Search.sources) {
                show('➕ Добавляем в Lampa.Search.sources');
                Lampa.Search.sources.scts = createSourceObj();
                show('✅ Добавлено');
                checkResult();
                return;
            }
            // Или просто присваиваем новый метод
            Lampa.Search.scts = function(query, callback) {
                // Используем наш поиск
                var source = createSourceObj();
                source.search(query, callback);
            };
            show('✅ Добавлен метод Lampa.Search.scts');
            checkResult();
            return;
        }

        // 3. Пробуем Lampa.Controller
        if (typeof Lampa.Controller !== 'undefined' && Lampa.Controller) {
            show('🔧 Lampa.Controller найден. Ключи: ' + Object.keys(Lampa.Controller).join(', '));
            // Может быть метод addSource
            if (typeof Lampa.Controller.addSource === 'function') {
                show('➕ Пробуем Lampa.Controller.addSource');
                doRegister(Lampa.Controller);
                return;
            }
        }

        // 4. Ничего не помогло — выводим структуру Lampa
        show('❌ Не удалось найти подходящий контейнер. Структура Lampa:');
        for (var key in Lampa) {
            if (typeof Lampa[key] === 'object' && Lampa[key] !== null) {
                show('📦 ' + key + ': ' + Object.keys(Lampa[key]).join(', '));
            } else {
                show('📦 ' + key + ': ' + typeof Lampa[key]);
            }
        }
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

    var doRegister = function(container) {
        var source = createSourceObj();
        var key = 'scts';

        if (typeof container.add === 'function') {
            try {
                container.add(key, source);
                show('✅ Зарегистрировано через add()');
                checkResult();
                return;
            } catch(e) { show('❌ Ошибка add(): ' + e.message); }
        }
        if (typeof container.register === 'function') {
            try {
                container.register(key, source);
                show('✅ Зарегистрировано через register()');
                checkResult();
                return;
            } catch(e) { show('❌ Ошибка register(): ' + e.message); }
        }
        // Если нет методов, добавляем в хранилище
        if (container.sources) {
            container.sources[key] = source;
            show('✅ Добавлено в container.sources');
            checkResult();
            return;
        }
        // Иначе просто присваиваем свойство
        container[key] = source;
        show('✅ Добавлено как container.' + key);
        checkResult();
    };

    var checkResult = function() {
        // Проверяем, появился ли источник в Lampa.Search или Lampa.Plugins
        var found = false;
        if (Lampa.Search && Lampa.Search.sources && Lampa.Search.sources.scts) {
            found = true;
        }
        if (Lampa.Plugins && Lampa.Plugins.scts) {
            found = true;
        }
        if (found) {
            show('🎉 Источник SCTS TV добавлен! Перезапустите Lampa.');
        } else {
            show('⚠️ Источник не найден после регистрации. Попробуйте перезапустить Lampa.');
        }
        // Выводим структуру Lampa.Search и Lampa.Plugins для отладки
        if (Lampa.Search) {
            show('📋 Lampa.Search: ' + Object.keys(Lampa.Search).join(', '));
        }
        if (Lampa.Plugins) {
            show('📋 Lampa.Plugins: ' + Object.keys(Lampa.Plugins).join(', '));
        }
    };

    // Запускаем
    register();
})();
