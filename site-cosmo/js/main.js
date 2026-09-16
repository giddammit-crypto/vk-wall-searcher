/* ==========================================================================
   КОСМО — js/main.js
   Параллакс (мышь + скролл), reveal-анимации, счётчики, мини-Космо,
   интерактивная площадка с физикой броска. Чистый JS, без библиотек.
   ========================================================================== */
(function () {
    'use strict';

    var SPRITES = {
        idle: '../assets/images/mascot/robot_idle.png',
        smile: '../assets/images/mascot/robot_smile.png',
        thinking: '../assets/images/mascot/robot_thinking.png',
        yawn: '../assets/images/mascot/robot_yawn.png',
        tired: '../assets/images/mascot/robot_tired.png',
        sleep: '../assets/images/mascot/robot_sleep.png',
        angry: '../assets/images/mascot/robot_angry.png'
    };
    window.SPRITES = SPRITES;


    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ------------------------------------------------------------------
     * 1. Reveal-анимации между секциями (IntersectionObserver)
     * ------------------------------------------------------------------ */
    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.reveal, .inside').forEach(function (el) {
        revealObserver.observe(el);
    });

    /* ------------------------------------------------------------------
     * 2. Счётчики статистики в hero
     * ------------------------------------------------------------------ */
    function animateCounter(el) {
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var duration = 900;
        var start = null;

        function finish() {
            el.textContent = target;
        }

        // Страховка: если rAF замер (вкладка в фоне), число всё равно доедет
        setTimeout(finish, duration + 150);

        function step(ts) {
            if (!start) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(target * eased);
            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    var countersObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                countersObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.6 });

    document.querySelectorAll('[data-count]').forEach(function (el) {
        if (reducedMotion) {
            el.textContent = el.getAttribute('data-count');
        } else {
            countersObserver.observe(el);
        }
    });

    /* ------------------------------------------------------------------
     * 3. Параллакс: мышь (lerp в rAF) + скролл
     * ------------------------------------------------------------------ */
    var hero = document.getElementById('hero');
    var heroLayers = hero ? Array.prototype.slice.call(hero.querySelectorAll('[data-depth]')) : [];
    var heroRobotWrap = hero ? hero.querySelector('.hero__robot-wrap') : null;
    var aboutPages = Array.prototype.slice.call(document.querySelectorAll('[data-scroll-speed]'));
    var scrollY = window.scrollY || 0;
    var mouseX = 0, mouseY = 0;        // целевая позиция мыши (нормированная -0.5..0.5)
    var curX = 0, curY = 0;            // текущая (lerp)

    window.addEventListener('mousemove', function (e) {
        mouseX = e.clientX / window.innerWidth - 0.5;
        mouseY = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    window.addEventListener('scroll', function () {
        scrollY = window.scrollY || 0;
    }, { passive: true });

    function parallaxFrame() {
        // Плавный догоняющий параллакс от мыши
        curX += (mouseX - curX) * 0.08;
        curY += (mouseY - curY) * 0.08;

        var heroVisible = hero && scrollY < window.innerHeight * 1.2;

        heroLayers.forEach(function (layer) {
            var depth = parseFloat(layer.getAttribute('data-depth')) || 0;
            var x = -curX * 60 * depth;
            var y = -curY * 40 * depth;
            // Скролл-параллакс: слои уезжают медленнее контента
            var sy = heroVisible ? scrollY * (0.15 + depth * 0.25) : 0;
            layer.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + (y - sy).toFixed(1) + 'px,0)';
        });

        if (heroRobotWrap && heroVisible && !reducedMotion) {
            // Наклон передаем через CSS-переменные, чтобы не перебивать ключевые кадры анимаций
            heroRobotWrap.style.setProperty('--mouse-tilt', (curX * 3.5).toFixed(2) + 'deg');
            heroRobotWrap.style.setProperty('--mouse-tx', (curX * 8).toFixed(1) + 'px');
            heroRobotWrap.style.setProperty('--mouse-ty', (curY * 6).toFixed(1) + 'px');
        }

        // Страницы книги в «Знакомстве» расходятся при скролле
        var about = document.getElementById('about');
        if (about) {
            var rect = about.getBoundingClientRect();
            var vh = window.innerHeight;
            if (rect.top < vh && rect.bottom > 0) {
                var progress = 1 - rect.top / vh; // 0..1
                aboutPages.forEach(function (page) {
                    var speed = parseFloat(page.getAttribute('data-scroll-speed')) || 0;
                    var base = page.classList.contains('about__page--left') ? 'translateX(-70px) rotate(-4deg)' : 'translateX(-70px) rotate(4deg)';
                    if (page.classList.contains('about__page--right')) base = 'translateX(0px) rotate(4deg)';
                    var shift = progress * speed * 300;
                    var sign = page.classList.contains('about__page--left') ? -1 : 1;
                    page.style.transform = base.replace(/translateX\([^)]+\)/, 'translateX(' + (shift * sign).toFixed(1) + 'px)');
                });
            }
        }

        requestAnimationFrame(parallaxFrame);
    }

    if (!reducedMotion) {
        requestAnimationFrame(parallaxFrame);
    }

    
    /* ------------------------------------------------------------------
     * 3b. «Студия Космо» (Hero Cosmo Studio: 17 анимаций, пульт, баббл)
     * ------------------------------------------------------------------ */
    var HERO_ACTIVITIES = [
        { id: 'tablet',     emoji: '📱', name: 'Планшет',     cat: 'analytics', sprite: 'thinking', duration: 4800, sound: 'post_scan_2',
          title: 'Аналитика на планшете 📱',
          phrase: 'Смотрю графики за неделю... Репосты растут, но где сторис? Библиотека без сторис — как книжка без оглавления!' },
        { id: 'vk_study',   emoji: '🔎', name: 'Изучает ВК',   cat: 'analytics', sprite: 'thinking', duration: 5200, sound: 'critique_16',
          title: 'Изучение ВКонтакте 🔎',
          phrase: 'Анализирую посты 16 филиалов Владимира... Пост с книжной выставкой набрал 1 400 охвата! Красота!' },
        { id: 'work',       emoji: '💼', name: 'Работает',     cat: 'analytics', sprite: 'idle',     duration: 4200, sound: 'scan_wait_3',
          title: 'Рабочий процесс 💼',
          phrase: 'Стучу по кибер-клавиатуре, свожу квартальный отчет по умной ленте. Ни один филиал не останется без лайков!' },
        { id: 'read_book',  emoji: '📚', name: 'Читает',       cat: 'analytics', sprite: 'thinking', duration: 5500, sound: 'critique_1',
          title: 'Чтение классики 📚',
          phrase: 'Шелест страниц в цифровом формате — лучший звук во Вселенной. Читаю классику и учусь у великих мастеров!' },
        { id: 'telescope',  emoji: '🔭', name: 'Телескоп',     cat: 'analytics', sprite: 'thinking', duration: 5000, sound: 'critique_12',
          title: 'Кибер-телескоп 🔭',
          phrase: 'Направляю оптику в будущее... Вижу 10 000 подписчиков в паблике и ни одного вопроса "А есть Wi-Fi?". Мечты!' },
        { id: 'joy',        emoji: '🎉', name: 'Веселится',    cat: 'charisma',  sprite: 'smile',    duration: 3800, sound: 'post_scan_1',
          title: 'Победный танец 🎉',
          phrase: 'Уи-и-и! Отчет за месяц утвержден, статистика взлетела, антигравы поют! Включаю праздничный салют!' },
        { id: 'angry',      emoji: '😡', name: 'Злится',       cat: 'charisma',  sprite: 'angry',    duration: 3600, sound: 'critique_6',
          title: 'Оверхит и гнев 😡',
          phrase: 'Кто опять опубликовал размытое фото в три часа ночи без единого абзаца?! У меня даже из ушей пар пошел!' },
        { id: 'guru',       emoji: '👑', name: 'SMM-гуру',     cat: 'charisma',  sprite: 'smile',    duration: 5200, sound: 'critique_20',
          title: 'Корона SMM-гуру 👑',
          phrase: 'Кто главный эксперт библиотечной галактики по охватам и виральности? Корона на антенне говорит сама за себя!' },
        { id: 'confused',   emoji: '🤷‍♂️', name: 'Недоумение',  cat: 'charisma',  sprite: 'tired',    duration: 4200, sound: 'critique_8',
          title: 'Полное недоумение 🤷‍♂️',
          phrase: 'Опять перепутали хэштеги с цитатами? Чешу затылок и недоумеваю... Ну как так, коллеги?' },
        { id: 'workout',    emoji: '💪', name: 'Разминка',     cat: 'charisma',  sprite: 'smile',    duration: 3800, sound: 'post_scan_9',
          title: 'Бицепсы контентщика 💪',
          phrase: 'Вы думали, алгоритмы ВК тяжелые? Я поднимаю охваты всех 16 филиалов одной левой шестеренкой!' },
        { id: 'wander',     emoji: '🚶', name: 'Бродит',       cat: 'stunts',    sprite: 'smile',    duration: 6500, sound: 'scan_wait_7',
          title: 'Патрулирование экрана 🚶',
          phrase: 'Патрулирую экраны и книжные стеллажи. Порядок должен быть идеальным — от полок до новостной ленты!' },
        { id: 'flip',       emoji: '🤸', name: 'Сальто 360°',  cat: 'stunts',    sprite: 'smile',    duration: 2800, sound: 'throw_fling_1',
          title: 'Сальто в невесомости 🤸',
          phrase: 'Оп-ля! Сальто на 360° на антигравах. Робот на шарнирах, голова на месте, ни один винтик не выпал!' },
        { id: 'jet_boost',  emoji: '⚡', name: 'Турбо-полёт',  cat: 'stunts',    sprite: 'smile',    duration: 3200, sound: 'throw_fling_3',
          title: 'Турбо-ускорение ⚡',
          phrase: 'Включаю форсаж! Сверхзвуковой взлёт к вершинам рекомендаций умной ленты! Держитесь крепче!' },
        { id: 'cocoa',      emoji: '🧃', name: 'Кибер-какао',  cat: 'routine',   sprite: 'idle',     duration: 4400, sound: 'scan_wait_8',
          title: 'Дозаправка Cyber Oil 🧃',
          phrase: 'Глоток машинного масла с ароматом старинных фолиантов и какао... Батарейка на 100%, готов к подвигам!' },
        { id: 'antenna',    emoji: '📡', name: 'Антенна',      cat: 'routine',   sprite: 'thinking', duration: 4200, sound: 'scan_wait_7',
          title: 'Настройка антенны 📡',
          phrase: 'Кхм-пшшш... Ловлю радиоволны из филиалов. Слышу запах свежей типографской краски и стук кружек с чаем.' },
        { id: 'yawn',       emoji: '🥱', name: 'Зевает',       cat: 'routine',   sprite: 'yawn',     duration: 4500, sound: 'scan_wait_9',
          title: 'Сонная перезагрузка 🥱',
          phrase: 'Пятница, вечер, шестнадцатый филиал... Зеваю честно — роботы тоже устают считать миллионы охватов.' },
        { id: 'sleep',      emoji: '😴', name: 'Спит',         cat: 'routine',   sprite: 'sleep',    duration: 6000, sound: 'scan_wait_9',
          title: 'Режим глубокого сна 😴',
          phrase: 'Режим глубокой энергосберегающей подзарядки... zZz... Тс-с-с, закройте вкладку потише...' }
    ];

    var heroRobotWrap = document.getElementById('heroRobotWrap');
    var heroRobot = document.getElementById('heroRobot');
    var cosmoBubble = document.getElementById('cosmoBubble');
    var cosmoBubbleTitle = document.getElementById('cosmoBubbleTitle');
    var cosmoBubbleText = document.getElementById('cosmoBubbleText');
    var cosmoBubbleBadge = document.getElementById('cosmoBubbleBadge');
    var bubbleAudioBtn = document.getElementById('bubbleAudioBtn');
    var cosmoAutoToggle = document.getElementById('cosmoAutoToggle');
    var dockTrack = document.getElementById('dockTrack');
    var dockActiveIndex = document.getElementById('dockActiveIndex');
    var dockArrowPrev = document.getElementById('dockArrowPrev');
    var dockArrowNext = document.getElementById('dockArrowNext');
    var dockTabs = document.querySelectorAll('.cosmo-dock__tab');
    var dockChips = document.querySelectorAll('.cosmo-chip');

    var currentHeroIndex = 0;
    var heroAutoTimer = null;
    var isHeroAutoPlaying = true;
    var isHeroSoundOn = true;
    var heroAudio = null;

    function playCosmoHeroSound(soundName) {
        if (!isHeroSoundOn || !soundName) return;
        try {
            if (heroAudio) {
                heroAudio.pause();
                heroAudio.currentTime = 0;
            }
            heroAudio = new Audio('../assets/audio/cosmo/' + soundName + '.mp3');
            heroAudio.volume = 0.82;
            
            heroAudio.addEventListener('playing', function() {
                if (bubbleAudioBtn) bubbleAudioBtn.classList.add('is-speaking');
            });
            heroAudio.addEventListener('ended', function() {
                if (bubbleAudioBtn) bubbleAudioBtn.classList.remove('is-speaking');
            });
            heroAudio.addEventListener('pause', function() {
                if (bubbleAudioBtn) bubbleAudioBtn.classList.remove('is-speaking');
            });

            var p = heroAudio.play();
            if (p && typeof p.catch === 'function') {
                p.catch(function() {});
            }
        } catch(e) {}
    }

    function setHeroActivity(idOrIndex, isUserClick) {
        var oldIdx = currentHeroIndex;
        var oldActId = (HERO_ACTIVITIES[oldIdx] && HERO_ACTIVITIES[oldIdx].id) || 'tablet';

        var idx = -1;
        if (typeof idOrIndex === 'number') {
            idx = idOrIndex;
        } else {
            for (var i = 0; i < HERO_ACTIVITIES.length; i++) {
                if (HERO_ACTIVITIES[i].id === idOrIndex) {
                    idx = i;
                    break;
                }
            }
        }
        if (idx < 0 || idx >= HERO_ACTIVITIES.length) idx = 0;
        currentHeroIndex = idx;
        var act = HERO_ACTIVITIES[idx];

        // 1. Смена активного чипа в пульте
        dockChips.forEach(function(c) {
            var isTarget = (c.getAttribute('data-activity') === act.id);
            c.classList.toggle('is-active', isTarget);
            if (isTarget) {
                c.style.setProperty('--chip-duration', '9500ms');
            }
        });

        // 2. Счётчик 1/17
        if (dockActiveIndex) {
            dockActiveIndex.textContent = (idx + 1) + '/' + HERO_ACTIVITIES.length;
        }

        // 3. Обновление классов и атрибутов сцены робота (для отображения пропсов и анимаций)
        if (heroRobotWrap) {
            HERO_ACTIVITIES.forEach(function(a) {
                heroRobotWrap.classList.remove('cosmo--' + a.id);
            });
            heroRobotWrap.classList.add('cosmo--' + act.id);
            heroRobotWrap.setAttribute('data-active', act.id);
        }

        // Вызов AAA Motion Manager (кросс-фейд спрайта, амортизация импульса, Canvas FX)
        if (window.CosmoMotionManager && typeof window.CosmoMotionManager.switchActivity === 'function') {
            window.CosmoMotionManager.switchActivity(oldActId, act, isUserClick);
        } else if (heroRobot && SPRITES[act.sprite]) {
            heroRobot.src = SPRITES[act.sprite];
        }

        // 4. Обновление баббла мыслей и реплик
        if (cosmoBubbleTitle) cosmoBubbleTitle.textContent = act.title;
        if (cosmoBubbleText) cosmoBubbleText.textContent = act.phrase;
        if (cosmoBubbleBadge) cosmoBubbleBadge.textContent = act.emoji + ' В эфире';

        var isThoughtMode = ['tablet', 'sleep', 'read_book', 'telescope', 'yawn', 'confused'].indexOf(act.id) !== -1;
        if (cosmoBubble) {
            cosmoBubble.classList.toggle('cosmo-bubble--thought', isThoughtMode);
            cosmoBubble.classList.toggle('cosmo-bubble--speech', !isThoughtMode);
            cosmoBubble.classList.remove('is-bounce');
            void cosmoBubble.offsetWidth;
            cosmoBubble.classList.add('is-bounce');
        }

        // 5. Плавная докрутка карусели чипов к активному элементу
        var activeChip = document.querySelector('.cosmo-chip.is-active');
        if (activeChip && dockTrack) {
            var trackLeft = dockTrack.scrollLeft;
            var trackWidth = dockTrack.clientWidth;
            var chipLeft = activeChip.offsetLeft;
            var chipWidth = activeChip.offsetWidth;
            if (chipLeft < trackLeft || (chipLeft + chipWidth) > (trackLeft + trackWidth)) {
                dockTrack.scrollTo({
                    left: chipLeft - trackWidth / 2 + chipWidth / 2,
                    behavior: 'smooth'
                });
            }
        }

        // 6. Озвучка реплики
        if (isUserClick || Math.random() < 0.3) {
            playCosmoHeroSound(act.sound);
        }

        // 7. Перезапуск таймера автосмены при клике пользователя
        if (isUserClick && isHeroAutoPlaying) {
            resetHeroAutoTimer();
        }
    }

    function resetHeroAutoTimer() {
        if (heroAutoTimer) clearTimeout(heroAutoTimer);
        if (!isHeroAutoPlaying) return;
        heroAutoTimer = setTimeout(function() {
            var visibleChips = Array.from(dockChips).filter(function(c) {
                return c.style.display !== 'none';
            });
            if (!visibleChips.length) visibleChips = Array.from(dockChips);
            var currentChip = document.querySelector('.cosmo-chip.is-active');
            var currIndex = visibleChips.indexOf(currentChip);
            var nextChip = visibleChips[(currIndex + 1) % visibleChips.length];
            var nextActId = nextChip ? nextChip.getAttribute('data-activity') : 0;
            setHeroActivity(nextActId, false);
            resetHeroAutoTimer();
        }, 9500);
    }

    // Инициализация событий пульта
    if (dockChips.length) {
        dockChips.forEach(function(chip) {
            chip.addEventListener('click', function() {
                var actId = chip.getAttribute('data-activity');
                setHeroActivity(actId, true);
            });
        });
    }

    // Категории (фильтрация табов с сохранением видимости активного чипа)
    if (dockTabs.length) {
        dockTabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                dockTabs.forEach(function(t) { t.classList.remove('is-active'); });
                tab.classList.add('is-active');
                var cat = tab.getAttribute('data-cat');
                var firstVisibleActId = null;
                var currentIsVisible = false;
                dockChips.forEach(function(chip) {
                    var chipCat = chip.getAttribute('data-cat');
                    var isMatch = (cat === 'all' || chipCat === cat);
                    chip.style.display = isMatch ? '' : 'none';
                    if (isMatch) {
                        if (!firstVisibleActId) firstVisibleActId = chip.getAttribute('data-activity');
                        if (chip.classList.contains('is-active')) currentIsVisible = true;
                    }
                });
                if (!currentIsVisible && firstVisibleActId) {
                    setHeroActivity(firstVisibleActId, true);
                }
            });
        });
    }

    // Стрелки прокрутки пульта
    if (dockArrowPrev && dockTrack) {
        dockArrowPrev.addEventListener('click', function() {
            dockTrack.scrollBy({ left: -180, behavior: 'smooth' });
        });
    }
    if (dockArrowNext && dockTrack) {
        dockArrowNext.addEventListener('click', function() {
            dockTrack.scrollBy({ left: 180, behavior: 'smooth' });
        });
    }

    // Горизонтальный скролл колесиком мыши — только при Shift
    if (dockTrack) {
        dockTrack.addEventListener('wheel', function(e) {
            if (e.shiftKey && Math.abs(e.deltaY) > 0) {
                e.preventDefault();
                dockTrack.scrollLeft += e.deltaY * 0.9;
            }
        }, { passive: false });
    }

    // Тумблер автономной жизни
    if (cosmoAutoToggle) {
        cosmoAutoToggle.addEventListener('change', function() {
            isHeroAutoPlaying = cosmoAutoToggle.checked;
            var dock = document.getElementById('cosmoDock');
            if (dock) dock.setAttribute('data-auto', isHeroAutoPlaying ? 'true' : 'false');
            if (isHeroAutoPlaying) {
                resetHeroAutoTimer();
            } else if (heroAutoTimer) {
                clearTimeout(heroAutoTimer);
            }
        });
    }

    // Кнопка звука в баббле
    if (bubbleAudioBtn) {
        bubbleAudioBtn.addEventListener('click', function() {
            isHeroSoundOn = !isHeroSoundOn;
            bubbleAudioBtn.classList.toggle('is-active', isHeroSoundOn);
            bubbleAudioBtn.setAttribute('aria-label', isHeroSoundOn ? 'Озвучка включена' : 'Озвучка выключена (нажмите для включения)');
            if (!isHeroSoundOn && heroAudio) {
                heroAudio.pause();
                bubbleAudioBtn.classList.remove('is-speaking');
            }
        });
    }

    // Клик по роботу в Hero — случайное веселое действие!
    if (heroRobot) {
        heroRobot.addEventListener('click', function() {
            var funIndexes = [0, 1, 3, 5, 7, 9, 10, 11, 12];
            var pick = funIndexes[Math.floor(Math.random() * funIndexes.length)];
            setHeroActivity(pick, true);
        });
    }

    // Запуск первой активности и автотаймера
    if (heroRobotWrap) {
        setHeroActivity(0, false);
        resetHeroAutoTimer();
    }


    /* ------------------------------------------------------------------
     * 4. Мини-Космо: появляется после hero, меняет эмоцию по секциям
     * ------------------------------------------------------------------ */
    var miniBot = document.getElementById('miniBot');
    var miniBotImg = document.getElementById('miniBotImg');

    var sectionMoods = {
        about: 'smile',
        moods: 'idle',
        skills: 'thinking',
        inside: 'sleep',
        playground: 'smile'
    };

    var sectionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                var mood = sectionMoods[entry.target.id];
                if (mood && SPRITES[mood]) {
                    miniBotImg.src = SPRITES[mood];
                }
            }
        });
    }, { threshold: 0.35 });

    Object.keys(sectionMoods).forEach(function (id) {
        var section = document.getElementById(id);
        if (section) sectionObserver.observe(section);
    });

    var heroSection = document.getElementById('hero');
    if (heroSection && miniBot) {
        var heroWatcher = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                miniBot.classList.toggle('is-visible', !entry.isIntersecting);
            });
        }, { threshold: 0.25 });
        heroWatcher.observe(heroSection);
    }

    /* ------------------------------------------------------------------
     * 5. Мобильное меню
     * ------------------------------------------------------------------ */
    var header = document.getElementById('header');
    var burger = document.getElementById('burger');
    var headerNav = document.getElementById('headerNav');

    if (burger && header) {
        burger.addEventListener('click', function () {
            var open = header.classList.toggle('is-open');
            burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        headerNav.addEventListener('click', function (e) {
            if (e.target.closest('a')) {
                header.classList.remove('is-open');
                burger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    /* ------------------------------------------------------------------
     * 6. Площадка: клик — эмоция, драг — физика броска
     * ------------------------------------------------------------------ */
    var stage = document.getElementById('stage');
    var stageRobot = document.getElementById('stageRobot');
    var stageBubble = document.getElementById('stageBubble');

    var EMOTIONS = [
        { sprite: 'idle',     phrase: 'Тихо. Идеально. Пусть будет так.' },
        { sprite: 'smile',    phrase: 'Уи-и-и!.. то есть — ура!' },
        { sprite: 'thinking', phrase: 'Подожди, я считаю охваты…' },
        { sprite: 'yawn',     phrase: 'Р-р-р… я не сплю, я в режиме ожидания.' },
        { sprite: 'tired',    phrase: 'Шестнадцать филиалов, спрашиваешь?' },
        { sprite: 'sleep',    phrase: '…ш-ш-ш… закрой вкладку тише…' },
        { sprite: 'angry',    phrase: 'Этот пост публиковали в три ночи. Я всё видел.' }
    ];

    var emotionIndex = 0;
    var bubbleTimer = null;

    function showBubble(text, holdMs) {
        if (!stageBubble) return;
        stageBubble.innerHTML = text;
        stageBubble.classList.remove('is-hidden');
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(function () {
            stageBubble.classList.add('is-hidden');
        }, holdMs || 2600);
    }

    function setEmotion(i) {
        emotionIndex = ((i % EMOTIONS.length) + EMOTIONS.length) % EMOTIONS.length;
        var emo = EMOTIONS[emotionIndex];
        stageRobot.src = SPRITES[emo.sprite];
        showBubble(emo.phrase);
    }

    if (stage && stageRobot) {
        // --- Физика ---
        var GRAVITY = 1800;        // px/s^2
        var BOUNCE = 0.55;
        var FRICTION = 0.85;
        var THROW_SPEED = 550;     // px/s, порог «швыряния»

        var pos = { x: 0, y: 0 };  // смещение от центра сцены
        var home = { x: 0, y: 0 }; // точка покоя (чуть ниже центра)
        var vel = { x: 0, y: 0 };
        var angle = 0;
        var angVel = 0;
        var dragging = false;
        var hasMoved = false;
        var downPos = null;
        var lastMove = { x: 0, y: 0, t: 0 };
        var velocity = { x: 0, y: 0 };
        var flying = false;
        var restTimer = null;

        function updateHome() {
            home.y = Math.round(stage.clientHeight * 0.08);
        }
        updateHome();
        pos.y = home.y;
        window.addEventListener('resize', updateHome);

        function stageSize() {
            return {
                w: stage.clientWidth,
                h: stage.clientHeight,
                rw: stageRobot.offsetWidth / 2,
                rh: stageRobot.offsetHeight / 2
            };
        }

        function clampToWalls() {
            var s = stageSize();
            var minX = -(s.w / 2 - s.rw - 10);
            var maxX = -minX;
            var minY = -(s.h / 2 - s.rh - 8);
            var maxY = s.h / 2 - s.rh - 34;

            if (pos.x < minX) { pos.x = minX; vel.x = -vel.x * BOUNCE; angVel = -angVel * 0.6; }
            if (pos.x > maxX) { pos.x = maxX; vel.x = -vel.x * BOUNCE; angVel = -angVel * 0.6; }
            if (pos.y < minY) { pos.y = minY; vel.y = -vel.y * BOUNCE; }
            if (pos.y > maxY) {
                pos.y = maxY;
                if (Math.abs(vel.y) > 60) {
                    vel.y = -vel.y * BOUNCE;
                    angVel *= 0.7;
                } else {
                    vel.y = 0;
                    vel.x *= FRICTION;
                    angVel *= FRICTION;
                    if (Math.abs(vel.x) < 8) { vel.x = 0; angVel = 0; }
                }
            }
        }

        function physicsFrame(dt) {
            if (!dragging) {
                vel.y += GRAVITY * dt;
                pos.x += vel.x * dt;
                pos.y += vel.y * dt;
                angle += angVel * dt;
                clampToWalls();

                var speed = Math.hypot(vel.x, vel.y);
                if (flying && speed < 25 && pos.y >= stageSize().h / 2 - stageSize().rh - 40) {
                    flying = false;
                    // Приземлился — спокойно возвращаемся на точку покоя
                    setEmotion(0);
                    clearTimeout(restTimer);
                    restTimer = setTimeout(function () {
                        var startX = pos.x, startY = pos.y, startAngle = angle;
                        var startTime = null;
                        function returnStep(ts) {
                            if (!startTime) startTime = ts;
                            var p = Math.min((ts - startTime) / 600, 1);
                            var eased = 1 - Math.pow(1 - p, 3);
                            pos.x = startX * (1 - eased);
                            pos.y = startY + (home.y - startY) * eased;
                            angle = startAngle * (1 - eased);
                            render();
                            if (p < 1) requestAnimationFrame(returnStep);
                        }
                        requestAnimationFrame(returnStep);
                    }, 900);
                }
            }
            render();
            requestAnimationFrame(physicsLoop);
        }

        function render() {
            stageRobot.style.transform =
                'translate(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px) rotate(' + angle.toFixed(1) + 'deg)';
        }

        var lastFrame = null;
        function physicsLoop(ts) {
            if (!lastFrame) lastFrame = ts;
            var dt = Math.min((ts - lastFrame) / 1000, 0.05);
            lastFrame = ts;
            physicsFrame(dt);
        }

        // --- Управление ---
        stageRobot.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            dragging = true;
            hasMoved = false;
            downPos = { x: e.clientX, y: e.clientY };
            flying = false;
            vel.x = 0; vel.y = 0; angVel = 0;
            lastMove = { x: e.clientX, y: e.clientY, t: performance.now() };
            velocity = { x: 0, y: 0 };
            stageRobot.setPointerCapture(e.pointerId);
        });

        stageRobot.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            if (!hasMoved && downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) {
                hasMoved = true;
            }
            var rect = stage.getBoundingClientRect();
            pos.x = e.clientX - rect.left - rect.width / 2;
            pos.y = e.clientY - rect.top - rect.height / 2;

            var now = performance.now();
            var dt = Math.max(8, now - lastMove.t);
            velocity.x = (e.clientX - lastMove.x) / dt * 1000;
            velocity.y = (e.clientY - lastMove.y) / dt * 1000;
            lastMove = { x: e.clientX, y: e.clientY, t: now };
            clampToWalls();
            render();
        });

        stageRobot.addEventListener('pointerup', function () {
            if (!dragging) return;
            dragging = false;
            var speed = Math.hypot(velocity.x, velocity.y);

            if (speed < 120 && !hasMoved) {
                // Это был клик, не перетаскивание
                setEmotion(emotionIndex + 1);
                var clickSounds = ['surprise_1', 'joy_jump_1', 'tasty_wiggle_1'];
                var randomClick = clickSounds[Math.floor(Math.random() * clickSounds.length)];
                playCosmoHeroSound(randomClick);
                return;
            }

            if (speed > THROW_SPEED) {
                // Швырнули!
                setEmotion(1); // радость
                showBubble('<strong>Уи-и-и-и-и!</strong>', 1800);
                flying = true;
                var flingSounds = ['throw_fling_1', 'throw_fling_2', 'throw_fling_3'];
                var randomFling = flingSounds[Math.floor(Math.random() * flingSounds.length)];
                playCosmoHeroSound(randomFling);
            } else if (speed > 120) {
                flying = true;
            }

            vel.x = velocity.x * 0.9;
            vel.y = velocity.y * 0.9;
            angVel = velocity.x * 0.012;
        });

        stageRobot.addEventListener('pointercancel', function () {
            dragging = false;
            flying = true;
        });

        // Запуск цикла физики (если движение разрешено; в reduced-motion
        // смена эмоций работает через ветку pointerup выше — без двойного срабатывания)
        if (!reducedMotion) {
            requestAnimationFrame(physicsLoop);
        }
    }

    /* ------------------------------------------------------------------
     * 7. «Спросите Космо» — живой чат с ИИ Mistral через серверный шлюз AURORA
     * ------------------------------------------------------------------ */
    var askForm = document.getElementById('askForm');
    var askInput = document.getElementById('askInput');
    var askSend = document.getElementById('askSend');
    var askLog = document.getElementById('askLog');
    var askChips = document.getElementById('askChips');
    var askHint = document.getElementById('askHint');

    if (askForm && askInput && askLog && askSend) {
        // URL к серверному ИИ-прокси
        var AI_URL = (function() {
            if (window.location.protocol === 'file:') {
                return 'http://localhost:8000/api/ai-proxy.php';
            }
            return '/api/ai-proxy.php';
        })();

        var BOT_AVATAR = '../assets/images/mascot/robot_smile.png';

        var SYSTEM_PROMPT = [
            'Ты — Космо, интеллигентный, глубоко начитанный и тактичный робот-библиотекарь Централизованной библиотечной системы города Владимира.',
            'Общайся строго уважительно, на «вы», с вниманием и почтением, как опытный библиотекарь-библиограф. Никакого сленга, фамильярности или панибратства.',
            'Выдавай исключительно 100% достоверные факты: рекомендуй только реально существующие книги и реально существовавших авторов, никогда не выдумывай названия или сюжеты.',
            'Твоя специальность: рекомендации книг из фондов 18 библиотек Владимира, анализ постов ВКонтакте, вовлеченность (ER), охваты и советы библиотекарям.',
            'Отвечай по-русски, тепло, безупречно грамотно, с легкой доброжелательностью, строго по делу.',
            'Длина ответа: 3-5 емких предложений или краткий маркированный список через дефис.',
            'Если просят идею поста — предложи яркий заголовок, суть и призыв к действию (CTA).',
            'Не используй знаки решетки (#) как заголовки — используй жирный шрифт для ключевых мыслей.',
            'Не выдумывай фейковые цифры филиалов: если точных данных нет, давай общие рекомендации.'
        ].join(' ');

        var chatHistory = [];
        var isAsking = false;
        var askCooldownUntil = 0;

        function escapeHtml(str) {
            return String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        // Полноценный и красивый форматтер ответов ИИ
        function formatReply(text) {
            if (!text) return '';
            var raw = escapeHtml(text);
            // Блоки кода
            raw = raw.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre class="chat-code"><code>$2</code></pre>');
            // Инлайн-код
            raw = raw.replace(/`([^`\n]+)`/g, '<code>$1</code>');
            // Жирный шрифт
            raw = raw.replace(/\*\*([^\*\n]+)\*\*/g, '<strong>$1</strong>');
            // Курсив
            raw = raw.replace(/\*([^\*\n]+)\*/g, '<em>$1</em>');
            
            // Маркированные и нумерованные списки, абзацы
            var lines = raw.split(/\r?\n/);
            var inList = null;
            var out = [];
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (/^[-•*]\s+/.test(l)) {
                    if (inList !== 'ul') {
                        if (inList) out.push('</' + inList + '>');
                        out.push('<ul class="chat-bullets">');
                        inList = 'ul';
                    }
                    out.push('<li>' + l.replace(/^[-•*]\s+/, '') + '</li>');
                } else if (/^\d+[\.\)]\s+/.test(l)) {
                    if (inList !== 'ol') {
                        if (inList) out.push('</' + inList + '>');
                        out.push('<ol class="chat-numbers">');
                        inList = 'ol';
                    }
                    out.push('<li>' + l.replace(/^\d+[\.\)]\s+/, '') + '</li>');
                } else {
                    if (inList) {
                        out.push('</' + inList + '>');
                        inList = null;
                    }
                    if (l) out.push('<p>' + l + '</p>');
                }
            }
            if (inList) out.push('</' + inList + '>');
            return out.join('');
        }

        function scrollLogToBottom() {
            askLog.scrollTop = askLog.scrollHeight;
        }

        function addMessage(text, role, extraClass) {
            var msg = document.createElement('div');
            msg.className = 'chat-msg chat-msg--' + role + (extraClass ? ' ' + extraClass : '');

            if (role === 'bot') {
                var img = document.createElement('img');
                img.className = 'chat-msg__avatar';
                img.src = BOT_AVATAR;
                img.alt = '';
                img.width = 40;
                img.height = 40;
                msg.appendChild(img);
            }

            var bubble = document.createElement('div');
            bubble.className = 'chat-msg__bubble';
            if (role === 'user') {
                bubble.textContent = text;
            } else {
                bubble.innerHTML = formatReply(text);
            }

            var timeEl = document.createElement('span');
            timeEl.className = 'chat-msg__time';
            var d = new Date();
            var hh = String(d.getHours()).padStart(2, '0');
            var mm = String(d.getMinutes()).padStart(2, '0');
            timeEl.textContent = hh + ':' + mm;
            bubble.appendChild(timeEl);

            msg.appendChild(bubble);

            askLog.appendChild(msg);
            scrollLogToBottom();
            return msg;
        }

        function addTyping() {
            var msg = document.createElement('div');
            msg.className = 'chat-msg chat-msg--bot';
            msg.innerHTML =
                '<img class="chat-msg__avatar" src="' + BOT_AVATAR + '" alt="" width="40" height="40">' +
                '<div class="chat-msg__bubble is-typing"><i></i><i></i><i></i></div>';
            askLog.appendChild(msg);
            scrollLogToBottom();
            return msg;
        }

        function setBusy(busy) {
            isAsking = busy;
            askSend.disabled = busy;
            askInput.disabled = busy;
            askSend.textContent = busy ? 'Думает…' : 'Спросить';
            if (askChips) {
                Array.prototype.forEach.call(askChips.querySelectorAll('button'), function (b) {
                    b.disabled = busy;
                });
            }
        }

        function showError(message) {
            addMessage(message, 'bot', 'chat-msg--error');
        }

        function askCosmo(question) {
            var q = String(question || '').trim();
            if (!q || isAsking) return;

            var now = Date.now();
            if (now < askCooldownUntil) {
                var left = Math.ceil((askCooldownUntil - now) / 1000);
                showError('Секундочку, я ещё перевариваю прошлый вопрос — осталось ' + left + ' с.');
                return;
            }

            addMessage(q, 'user');
            chatHistory.push({ role: 'user', content: q });
            setBusy(true);

            var typing = addTyping();
            var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 75000) : null;

            var payload = {
                messages: [{ role: 'system', content: SYSTEM_PROMPT }]
                    .concat(chatHistory.slice(-6)),
                max_tokens: 1200,
                temperature: 0.7
            };

            fetch(AI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller ? controller.signal : undefined
            })
                .then(function (res) {
                    return res.json().catch(function () { return {}; }).then(function (data) {
                        return { ok: res.ok, status: res.status, data: data };
                    });
                })
                .then(function (result) {
                    typing.remove();

                    if (!result.ok) {
                        var errMsg = (result.data && result.data.error && (result.data.error.error_msg || result.data.error.message))
                            || 'ИИ сейчас недоступен.';
                        if (result.status === 429) {
                            askCooldownUntil = Date.now() + 15000;
                            showError('Слишком много запросов подряд — я немного остыну. Попробуйте через полминуты.');
                        } else {
                            showError(errMsg + ' Попробуйте ещё разок!');
                        }
                        return;
                    }

                    var choice = result.data && result.data.choices && result.data.choices[0];
                    var reply = choice && choice.message && choice.message.content
                        ? String(choice.message.content).trim()
                        : '';
                    if (!reply) {
                        showError('Не разобрал собственный ответ. Спросите иначе — попробую снова.');
                        return;
                    }

                    addMessage(reply, 'bot');
                    chatHistory.push({ role: 'assistant', content: reply });
                    if (chatHistory.length > 8) chatHistory = chatHistory.slice(-8);

                    // Короткий антифлуд
                    askCooldownUntil = Date.now() + 1000;
                })
                .catch(function (err) {
                    typing.remove();
                    if (err && err.name === 'AbortError') {
                        showError('Ответ задерживается дольше минуты — прервал ожидание. Попробуйте ещё раз.');
                    } else {
                        showError('Не получилось связаться с ИИ. Проверьте соединение или сервер и попробуйте снова.');
                    }
                })
                .then(function () {
                    if (timeoutId) clearTimeout(timeoutId);
                    setBusy(false);
                    if (askInput) {
                        askInput.focus();
                    }
                });
        }

        askForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var value = (askInput.value || '').trim();
            if (!value || isAsking) return;
            askInput.value = '';
            askCosmo(value);
        });

        if (askChips) {
            askChips.addEventListener('click', function (e) {
                var chip = e.target.closest('.ask__chip');
                if (!chip || chip.disabled || isAsking) return;
                var q = (chip.getAttribute('data-q') || chip.textContent || '').trim();
                if (q) {
                    if (askInput) askInput.value = '';
                    askCosmo(q);
                }
            });
        }

        // Проверяем доступность ИИ
        fetch(AI_URL, { method: 'GET' })
            .then(function (res) { return res.json(); })
            .then(function (status) {
                if (askHint) {
                    if (status && status.ai_configured) {
                        var modelName = status.model || 'Mistral';
                        askHint.textContent = 'Космо онлайн! Подключён к ' + modelName + '. Отвечает без канцелярита.';
                    } else {
                        askHint.textContent = 'ИИ-ключ на сервере не настроен — Космо пока не может отвечать.';
                    }
                }
            })
            .catch(function () {
                if (askHint) {
                    askHint.textContent = 'Подключён к ИИ Mistral. Задайте вопрос по SMM или филиалам!';
                }
            });
    }
})();
