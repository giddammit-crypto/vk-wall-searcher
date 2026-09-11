/**
 * src/advice.js — движок персональных рекомендаций для филиалов (вкладка «Советы»)
 * =============================================================================
 * v3.4.2: расширенная аналитика — 20+ правил: активность, вовлечённость,
 * динамика ER, контент, SEO/хэштеги/ключевые слова, ссылки на сайт, время
 * и дни публикаций, закрепы, видео, опросы, «мёртвые периоды», подписчики.
 *
 * Разработка: Амброзиев О.А.
 */

import { escapeHtml, renderBranchAvatarHtml, findCanonicalBranch } from './branches.js?v=3.7.1';

const LEVEL_META = {
    success: { icon: 'check_circle', label: 'Отлично', cls: 'adv-success' },
    info:    { icon: 'info',         label: 'К сведению', cls: 'adv-info' },
    warn:    { icon: 'priority_high',label: 'Внимание', cls: 'adv-warn' },
    danger:  { icon: 'error',        label: 'Проблема', cls: 'adv-danger' }
};

/** Универсальный числовой экстрактор (число | объект {count} | строка) */
function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v && typeof v === 'object' && typeof v.count === 'number') return v.count;
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
}

function plural(n, forms) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
}

/** SEO/тематический словарь библиотечной тематики */
const SEO_WORDS = /владимир|библиотек|читател|книг|афиш|мероприят|акци|конкурс|встреч|мастер|класс|выставк|лекци|поэзи|литератур|детск|семейн|краевед|праздник|юбилей|недел[ьяюи]|час\b/i;

function buildAdviceForBranch(stat, ctx) {
    const items = [];
    const push = (level, title, text) => items.push({ level, title, text });

    const posts = stat.posts || [];
    const postsCount = stat.postsCount || 0;
    const weeks = Math.max(ctx.periodWeeks || 1, 0.25);
    const postsPerWeek = postsCount / weeks;
    const members = stat.info.members_count;

    if (postsCount === 0) {
        push('danger', 'Нет публикаций за выбранный период',
            'Страница филиала не обновлялась. Рекомендуемый минимум — 2–3 публикации в неделю: анонсы мероприятий, книжные подборки, фотоотчёты.');
        return { items, score: 5 };
    }

    // ---------- 1. АКТИВНОСТЬ ----------
    if (postsPerWeek >= 4) {
        push('success', `Высокий темп: ~${postsPerWeek.toFixed(1)} пост./нед.`,
            'Лента обновляется регулярно — алгоритм ВК стабильно показывает записи подписчикам.');
    } else if (postsPerWeek >= 2) {
        push('success', `Хороший темп: ~${postsPerWeek.toFixed(1)} пост./нед.`,
            'Частота соответствует рекомендациям для библиотечных сообществ (2–4 поста в неделю).');
    } else if (postsPerWeek >= 1) {
        push('warn', `Пониженный темп: ~${postsPerWeek.toFixed(1)} пост./нед.`,
            'Публикуйте не реже 2–3 записей в неделю, чтобы сообщество не теряло охват в умной ленте.');
    } else {
        push('danger', `Редкие публикации: ~${postsPerWeek.toFixed(1)} пост./нед.`,
            'Паузы больше недели резко снижают охват. Составьте контент-план минимум на 2 поста в неделю.');
    }

    // «Мёртвые периоды» — максимальная пауза между публикациями
    if (postsCount >= 3) {
        const dates = posts.map(p => p.date).filter(Boolean).sort((a, b) => a - b);
        let maxGap = 0;
        for (let i = 1; i < dates.length; i++) {
            maxGap = Math.max(maxGap, (dates[i] - dates[i - 1]) / 86400);
        }
        if (maxGap >= 14) {
            push('danger', `Пауза в публикациях — ${Math.round(maxGap)} ${plural(Math.round(maxGap), ['день', 'дня', 'дней'])}`,
                'Длинные «мёртвые периоды» умная лента воспринимает как неактивное сообщество. Держите равномерный ритм без провалов.');
        } else if (maxGap >= 8) {
            push('warn', `Пауза между публикациями до ${Math.round(maxGap)} дней`,
                'Старайтесь не допускать недельных провалов: заранее готовьте дежурные рубрики (цитаты, новинки, фото залов).');
        }
    }

    // ---------- 2. ВОВЛЕЧЁННОСТЬ ----------
    const er = stat.erViews || 0;
    if (er >= 3) {
        push('success', `Отличная вовлечённость — ER ${er.toFixed(2)}%`,
            'Аудитория активно реагирует. Делитесь успешными форматами с коллегами других филиалов.');
    } else if (er >= 1.5) {
        push('success', `Хорошая вовлечённость — ER ${er.toFixed(2)}%`,
            'Показатель выше среднего по библиотечной тематике (≈1–1,5%).');
    } else if (er >= 0.5) {
        push('warn', `Средняя вовлечённость — ER ${er.toFixed(2)}%`,
            'Добавьте интерактив: опросы, викторины, вопросы в конце поста, обсуждения новинок.');
    } else {
        push('danger', `Низкая вовлечённость — ER ${er.toFixed(2)}%`,
            'Подписчики почти не реагируют. Смените форматы: живые фото сотрудников, конкурсы репостов, афиши событий.');
    }

    // Динамика ER: первая половина периода против второй
    if (postsCount >= 8) {
        const sorted = [...posts].sort((a, b) => (a.date || 0) - (b.date || 0));
        const half = Math.floor(sorted.length / 2);
        const erOf = arr => {
            let v = 0, i2 = 0;
            arr.forEach(p => {
                const views = num(p.views);
                if (views > 0) i2 += (num(p.likes) + num(p.reposts) + num(p.comments)) / views;
                v += views;
            });
            return arr.length ? i2 / arr.length * 100 : 0;
        };
        const er1 = erOf(sorted.slice(0, half));
        const er2 = erOf(sorted.slice(half));
        if (er1 > 0.3 && er2 < er1 * 0.6) {
            push('warn', `Вовлечённость падает: ER ${er1.toFixed(2)}% → ${er2.toFixed(2)}% за период`,
                'Сравните удачные ранние посты с недавними: верните форматы, которые давали реакцию, и обновите рубрики.');
        } else if (er2 > er1 * 1.4 && er1 > 0) {
            push('success', `Вовлечённость растёт: ER ${er1.toFixed(2)}% → ${er2.toFixed(2)}%`,
                'Свежие форматы работают — закрепляйте успех и повторяйте приёмы.');
        }
    }

    // Комментарии
    const interactions = stat.totalInteractions || 0;
    if (interactions > 0) {
        const commentShare = ((stat.comments || 0) / interactions) * 100;
        if (commentShare < 5 && postsCount >= 3) {
            push('info', 'Мало комментариев относительно реакций',
                'Задавайте вопросы в конце записей («Какая книга вашего детства любимая?»), запускайте обсуждения — комментарии сильно поднимают охват.');
        } else if (commentShare >= 15) {
            push('success', 'Аудитория активно обсуждает записи',
                'Высокая доля комментариев — сообщество живое. Отвечайте на комментарии в течение дня.');
        }
    }

    // Доля репостов в ленте филиала (свой контент против чужого)
    const repostedOwn = posts.filter(p => p.copy_history && p.copy_history.length > 0).length;
    if (postsCount >= 5 && repostedOwn / postsCount > 0.4) {
        push('warn', `${Math.round(repostedOwn / postsCount * 100)}% ленты — репосты чужих записей`,
            'Репосты полезны дозировано, но подписчики приходят за вашим контентом. Держите баланс: минимум 70% собственных публикаций.');
    }

    // ---------- 3. ОХВАТ И АУДИТОРИЯ ----------
    const totalViewsNum = posts.reduce((s, p) => s + num(p.views), 0);
    const avgViewsReal = postsCount ? totalViewsNum / postsCount : 0;
    if (members && members > 0 && avgViewsReal > 0) {
        const reach = (avgViewsReal / members) * 100;
        if (reach < 10) {
            push('warn', `Низкий охват: запись видят ~${reach.toFixed(0)}% подписчиков`,
                'Публикуйте в часы активности аудитории (см. ниже) и используйте хэштеги — это расширяет показ в умной ленте.');
        } else if (reach >= 40) {
            push('success', `Высокий охват: ~${reach.toFixed(0)}% подписчиков видят записи`,
                'Контент доходит до большей части аудитории — отличный результат.');
        }
    }

    if (ctx.subsTrend && typeof ctx.subsTrend.month === 'number') {
        const t = ctx.subsTrend;
        if (t.month < 0) {
            push('warn', `Отток подписчиков: ${t.month} за 30 дней`,
                'Проверьте ритм публикаций и добавьте рубрику, ради которой подписываются: афиша, новинки фонда, конкурсы.');
        } else if (t.month > 0 && members && t.month / members > 0.02) {
            push('success', `Прирост подписчиков: +${t.month} за 30 дней`,
                'Сообщество растёт быстрее 2% в месяц — контент привлекает новую аудиторию.');
        } else if (t.month > 0) {
            push('info', `Подписчики растут медленно: +${t.month} за 30 дней`,
                'Ускорить рост помогут конкурсы с репостами, взаимные анонсы с филиалами и публикации в городских пабликах.');
        }
    }

    // ---------- 4. КОНТЕНТ И SEO ----------
    let hashtagPosts = 0, totalHashtags = 0;
    const tagFreq = new Map();
    let seoPosts = 0, linkPosts = 0, withAttach = 0, videoPosts = 0, pollPosts = 0, pinned = 0;
    let textLenSum = 0;
    const hourHist = {};
    const dayViews = {};
    const dayCount = {};
    let activeHoursPosts = 0;

    posts.forEach(p => {
        const text = p.text || '';
        textLenSum += text.length;

        const tags = text.match(/#[\wа-яё\-]+/gi);
        if (tags && tags.length) {
            hashtagPosts++;
            totalHashtags += tags.length;
            tags.forEach(t2 => tagFreq.set(t2.toLowerCase(), (tagFreq.get(t2.toLowerCase()) || 0) + 1));
        }
        if (SEO_WORDS.test(text)) seoPosts++;
        if (/https?:\/\//i.test(text) || (p.attachments || []).some(a => a.type === 'link')) linkPosts++;
        if (p.attachments && p.attachments.length) withAttach++;
        if ((p.attachments || []).some(a => a.type === 'video')) videoPosts++;
        if ((p.attachments || []).some(a => a.type === 'poll')) pollPosts++;
        if (p.is_pinned) pinned++;

        const d = new Date((p.date || 0) * 1000);
        const h = d.getHours();
        if (h >= 8 && h <= 21) activeHoursPosts++;
        if (!hourHist[h]) hourHist[h] = { v: 0, n: 0 };
        hourHist[h].v += num(p.views);
        hourHist[h].n++;
        const dw = (d.getDay() + 6) % 7;
        if (!dayViews[dw]) { dayViews[dw] = 0; dayCount[dw] = 0; }
        dayViews[dw] += num(p.views);
        dayCount[dw]++;
    });

    // Хэштеги и фирменный тег (SEO внутри ВК)
    if (postsCount >= 3) {
        if (hashtagPosts === 0) {
            push('warn', 'Публикации без хэштегов',
                'Добавляйте 3–5 тегов (#библиотека #Владимир #афиша + фирменный тег филиала) — записи находятся в поиске ВК и приводят новых читателей.');
        } else {
            const topTag = [...tagFreq.entries()].sort((a, b) => b[1] - a[1])[0];
            if (topTag && topTag[1] / Math.max(hashtagPosts, 1) >= 0.6) {
                push('success', `Есть фирменный хэштег ${topTag[0]} (${Math.round(topTag[1] / hashtagPosts * 100)}% постов)`,
                    'Единый тег филиала собирает все события в одну ленту и укрепляет узнаваемость.');
            } else if (hashtagPosts / postsCount < 0.5) {
                push('info', `Хэштеги есть только у ${Math.round(hashtagPosts / postsCount * 100)}% записей`,
                    'Используйте теги в каждой публикации: 3–5 штук, включая уникальный тег филиала.');
            }
        }
    }

    // Тематические ключевые слова (поисковый SEO-словарь)
    if (postsCount >= 5 && seoPosts / postsCount < 0.4) {
        push('warn', `Тематические ключевые слова только в ${Math.round(seoPosts / postsCount * 100)}% текстов`,
            'Чаще употребляйте поисковые слова тематики («книги», «читатели», «мероприятие», «афиша», «Владимир») — такие посты находятся в поиске ВК и Яндекса.');
    }

    // Ссылки на сайт
    if (postsCount >= 5 && linkPosts / postsCount < 0.1) {
        push('info', `Почти нет ссылок на сайт (${Math.round(linkPosts / postsCount * 100)}% записей)`,
            'Добавляйте ссылки на biblioteka33.ru в анонсы и отчёты — это переводит аудиторию ВК на сайт и улучшает SEO обоих ресурсов.');
    }

    // Визуальный контент
    if (postsCount >= 3) {
        const attachShare = (withAttach / postsCount) * 100;
        if (attachShare < 50) {
            push('warn', `Только ${Math.round(attachShare)}% записей с фото или видео`,
                'Записи с качественными фото набирают в 2–3 раза больше просмотров. Добавляйте обложки книг, фото залов и мероприятий.');
        } else if (attachShare >= 80) {
            push('success', 'Почти все записи с иллюстрациями',
                'Визуальный контент — сильная сторона сообщества.');
        }
    }

    // Видео и клипы
    if (postsCount >= 15 && videoPosts === 0) {
        push('info', 'Не используются видео и клипы',
            'VK продвигает видео и VK Клипы в рекомендациях даже неподписанным пользователям. Короткие ролики о новинках и событиях приведут новую аудиторию.');
    }

    // Опросы
    if (postsCount >= 20 && pollPosts === 0) {
        push('info', 'Не используются опросы',
            'Опросы — самый дешёвый способ поднять вовлечённость: «Какую книгу взять в кино?», «Выберите тему следующей встречи».');
    }

    // Закреплённая запись
    if (pinned === 0) {
        push('info', 'Нет закреплённой записи',
            'Закрепите навигационный пост: афиша месяца, адрес и часы работы, ссылки на главные рубрики — новые посетители сразу поймут, куда попали.');
    }

    // Длина текстов
    if (postsCount >= 5) {
        const avgLen = textLenSum / postsCount;
        if (avgLen < 90) {
            push('info', 'Очень короткие тексты (в среднем < 90 символов)',
                'Добавляйте контекст: что за событие, когда и где, кого ждёте. Развёрнутые анонсы дочитывают и ими делятся.');
        } else if (avgLen > 1600) {
            push('info', 'Очень длинные тексты (в среднем > 1600 символов)',
                'Лонгриды хороши, но начинайте с яркого лид-абзаца и разбивайте текст на абзацы — иначе лента обрезает его до «Читать далее».');
        }
    }

    // ---------- 5. ВРЕМЯ ПУБЛИКАЦИЙ ----------
    if (activeHoursPosts / postsCount < 0.6) {
        push('warn', `${Math.round(100 - activeHoursPosts / postsCount * 100)}% постов выходят ночью или поздно вечером`,
            'Публикации вне активности аудитории (8:00–21:00) теряют первый час показов — используйте отложенный постинг на утро.');
    }

    if (postsCount >= 6) {
        // Лучший час: минимум 2 поста в часе и средние просмотры выше среднего по филиалу
        const overallAvg = avgViewsReal;
        let bestHour = null, bestAvg = 0;
        Object.keys(hourHist).forEach(h => {
            const o = hourHist[h];
            const a = o.n >= 2 ? o.v / o.n : 0;
            if (a > bestAvg) { bestAvg = a; bestHour = parseInt(h, 10); }
        });
        if (bestHour !== null && bestAvg > 0 && overallAvg > 0) {
            const uplift = Math.round((bestAvg / overallAvg - 1) * 100);
            if (uplift >= 10) {
                push('info', `Лучшее время публикаций — около ${String(bestHour).padStart(2, '0')}:00`,
                    `Записи этого часа набирают в среднем ${Math.round(bestAvg).toLocaleString('ru-RU')} просмотров — на ${uplift}% выше среднего по филиалу. Планируйте важные анонсы на это время.`);
            }
        }

        // Лучший день недели
        const DAY_NAMES = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
        let bestDay = null, bestDayAvg = 0;
        Object.keys(dayViews).forEach(dw => {
            const a = dayCount[dw] >= 2 ? dayViews[dw] / dayCount[dw] : 0;
            if (a > bestDayAvg) { bestDayAvg = a; bestDay = parseInt(dw, 10); }
        });
        if (bestDay !== null && bestDayAvg > 0 && overallAvg > 0 && bestDayAvg / overallAvg >= 1.15) {
            push('info', `Самый удачный день — ${DAY_NAMES[bestDay]}`,
                `Средние просмотры в этот день — ${Math.round(bestDayAvg).toLocaleString('ru-RU')}. Ставьте ключевые анонсы на ${DAY_NAMES[bestDay]}.`);
        }
    }

    // Итоговый «индекс здоровья»
    let score = 100;
    items.forEach(i => {
        if (i.level === 'danger') score -= 25;
        else if (i.level === 'warn') score -= 10;
    });
    score = Math.max(5, Math.min(100, score));

    return { items, score };
}

/**
 * Строит данные вкладки для всех филиалов.
 * @param {Array} stats — результат calculateGroupStats
 * @param {object} opts — { periodWeeks, trendsByGroup }
 */
export function buildBranchAdvice(stats, opts = {}) {
    const periodWeeks = opts.periodWeeks || 4;
    const trends = opts.trendsByGroup || new Map();

    return stats.map(stat => {
        const subsTrend = trends.get(stat.info.id) || null;
        const built = buildAdviceForBranch(stat, { periodWeeks, subsTrend });
        return {
            info: stat.info,
            postsCount: stat.postsCount,
            erViews: stat.erViews || 0,
            members: stat.info.members_count || null,
            subsTrend,
            score: built.score,
            items: built.items
        };
    });
}

/**
 * Рендерит вкладку «Советы филиалам»
 */
export function renderAdviceTab(container, adviceData, opts = {}) {
    if (!container) return;

    if (!adviceData || adviceData.length === 0) {
        container.innerHTML = `
            <div class="advice-empty">
                <span class="material-symbols-outlined">lightbulb</span>
                <h3>Советы пока недоступны</h3>
                <p>Выполните поиск по записям филиалов — рекомендации будут построены по результатам сканирования.</p>
            </div>`;
        return;
    }

    const problemCount = { danger: 0, warn: 0 };
    let adviceTotal = 0;
    adviceData.forEach(b => {
        adviceTotal += b.items.length;
        b.items.forEach(i => {
            if (problemCount[i.level] !== undefined) problemCount[i.level]++;
        });
    });
    const avgScore = Math.round(adviceData.reduce((s, b) => s + b.score, 0) / adviceData.length);

    const cardsHtml = adviceData.map(branch => {
        const info = branch.info || {};
        let branchTitle = info.canonicalBranch || info.canonicalName || '';
        if (!branchTitle || branchTitle === 'DELETED') {
            const canon = findCanonicalBranch(info);
            if (canon) branchTitle = canon.canonicalName;
            else if (info.name && info.name !== 'DELETED') branchTitle = info.name;
            else branchTitle = 'Филиал библиотеки';
        }
        const name = escapeHtml(branchTitle);
        const scoreCls = branch.score >= 70 ? 'score-good' : (branch.score >= 40 ? 'score-mid' : 'score-bad');

        const itemsHtml = branch.items.map(item => {
            const meta = LEVEL_META[item.level] || LEVEL_META.info;
            return `
                <div class="advice-item ${meta.cls}">
                    <span class="material-symbols-outlined advice-item-icon">${meta.icon}</span>
                    <div class="advice-item-body">
                        <div class="advice-item-title">${escapeHtml(item.title)}</div>
                        <div class="advice-item-text">${escapeHtml(item.text)}</div>
                    </div>
                </div>`;
        }).join('');

        const trend = ctxTrendNote(branch);

        return `
        <div class="advice-branch-card card">
            <div class="advice-branch-head">
                <div class="advice-branch-id">
                    ${renderBranchAvatarHtml(info, 'md', 'advice-avatar')}
                    <div>
                        <h4 class="advice-branch-name">${name}</h4>
                        <div class="advice-branch-meta">
                            ${branch.postsCount} ${plural(branch.postsCount, ['публикация', 'публикации', 'публикаций'])} &bull; ER ${branch.erViews.toFixed(2)}%
                            ${branch.members ? ` &bull; ${branch.members.toLocaleString('ru-RU')} подписчиков` : ''}
                            ${trend}
                        </div>
                    </div>
                </div>
                <div class="advice-score ${scoreCls}" title="Индекс здоровья сообщества">
                    <span class="advice-score-num">${branch.score}</span>
                    <span class="advice-score-label">индекс</span>
                </div>
            </div>
            <div class="advice-items">${itemsHtml}</div>
        </div>`;
    }).join('');

    container.innerHTML = `
        <div class="advice-summary card">
            <div class="advice-summary-icon">
                <span class="material-symbols-outlined">psychology</span>
            </div>
            <div class="advice-summary-text">
                <h3>Автоматические рекомендации методиста</h3>
                <p>
                    Средний индекс здоровья сообществ: <b>${avgScore}/100</b>
                    ${opts.periodLabel ? ` &bull; период: ${escapeHtml(opts.periodLabel)}` : ''}
                    &bull; рекомендаций: <b>${adviceTotal}</b>, из них критичных: <b>${problemCount.danger}</b>, предупреждений: <b>${problemCount.warn}</b>.
                </p>
            </div>
        </div>
        <div class="advice-grid">${cardsHtml}</div>`;
}

function ctxTrendNote(branch) {
    const t = branch.subsTrend;
    if (!t || typeof t.month !== 'number') return '';
    if (t.month > 0) return ` &bull; <span class="delta up">+${t.month} подписчиков/30д</span>`;
    if (t.month < 0) return ` &bull; <span class="delta down">−${Math.abs(t.month)} подписчиков/30д</span>`;
    return '';
}
