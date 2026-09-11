import os
import sys
import time
import json
from playwright.sync_api import sync_playwright

RAW_VIDEO_DIR = "/home/astra/vint2/proj/vk_wall_searcher_php/video_production/raw_video"
os.makedirs(RAW_VIDEO_DIR, exist_ok=True)

# Clean up old raw recordings
for f in os.listdir(RAW_VIDEO_DIR):
    if f.endswith(".webm") or f.endswith(".mp4"):
        try:
            os.remove(os.path.join(RAW_VIDEO_DIR, f))
        except Exception:
            pass

def main():
    print("Starting Playwright browser for continuous screencast recording with splash, transitions & keyword callouts...")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=RAW_VIDEO_DIR,
            record_video_size={"width": 1920, "height": 1080}
        )
        page = context.new_page()

        t_video_start = time.time()
        # Navigate quickly
        page.goto("http://localhost:8000/", wait_until="domcontentloaded")
        time.sleep(1.0)

        # Inject VideoDirector with smooth cursor, ripples, smooth scrolling, typing,
        # splash screen, floating keywords, and smooth scene transitions
        page.evaluate('''(() => {
            document.getElementById('video-director-overlay')?.remove();

            const overlay = document.createElement('div');
            overlay.id = 'video-director-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '99999999';
            overlay.innerHTML = `
                <div id="vd-cursor" style="position:fixed; top:-50px; left:-50px; width:34px; height:34px; z-index:99999999; transform:translate(0,0); filter:drop-shadow(0 4px 12px rgba(0,0,0,0.85)); transition:transform 0.12s ease;">
                    <svg viewBox="0 0 24 24" width="34" height="34" fill="#3EE6C4">
                        <path d="M4 2l16 11.5-6.5 1.5 4 7-3 1.7-4-7-4.5 4.3z" stroke="#060918" stroke-width="1.8" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div id="vd-ripple" style="position:fixed; width:54px; height:54px; border-radius:50%; border:3px solid #3EE6C4; background:rgba(62,230,196,0.35); transform:translate(-50%,-50%) scale(0); opacity:0; pointer-events:none;"></div>
                <div id="vd-toast" style="position:fixed; bottom:40px; right:40px; padding:16px 26px; background:rgba(14,21,47,0.96); border:1.5px solid #3EE6C4; border-radius:14px; color:#ffffff; font-family:'Montserrat',sans-serif; font-size:15px; font-weight:600; box-shadow:0 12px 35px rgba(0,0,0,0.7), 0 0 25px rgba(62,230,196,0.3); transform:translateY(100px); opacity:0; transition:all 0.4s cubic-bezier(0.16, 1, 0.3, 1); display:flex; align-items:center; gap:12px; z-index:99999999;">
                    <span style="color:#3EE6C4; font-size:22px;">✓</span>
                    <span id="vd-toast-text">Действие выполнено</span>
                </div>
                <div id="vd-keyword-badge" style="position:fixed; top:28px; right:40px; padding:12px 28px; background:rgba(10,16,38,0.9); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1.5px solid #3EE6C4; border-radius:999px; color:#ffffff; font-family:'Montserrat',sans-serif; font-size:15.5px; font-weight:700; box-shadow:0 10px 35px rgba(0,0,0,0.75), 0 0 25px rgba(62,230,196,0.4); display:flex; align-items:center; gap:12px; z-index:99999995; pointer-events:none; transform:translateX(160px) scale(0.85); opacity:0; transition:transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.35s ease;">
                    <span id="vd-kw-icon" style="font-size:20px; filter:drop-shadow(0 0 8px #3EE6C4);">⚡</span>
                    <span id="vd-kw-text">Ключевое слово</span>
                </div>
            `;
            document.body.appendChild(overlay);

            let curX = -50, curY = -50;
            const cur = document.getElementById('vd-cursor');
            const rip = document.getElementById('vd-ripple');
            const toast = document.getElementById('vd-toast');
            const toastText = document.getElementById('vd-toast-text');
            const kw = document.getElementById('vd-keyword-badge');
            const kwIcon = document.getElementById('vd-kw-icon');
            const kwText = document.getElementById('vd-kw-text');

            window.VideoDirector = {
                moveTo: (tx, ty, duration = 600) => {
                    return new Promise(resolve => {
                        const startX = curX, startY = curY;
                        const startTime = performance.now();
                        function step(now) {
                            const elapsed = now - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            const ease = 1 - Math.pow(1 - progress, 3);
                            curX = startX + (tx - startX) * ease;
                            curY = startY + (ty - startY) * ease;
                            cur.style.left = curX + 'px';
                            cur.style.top = curY + 'px';
                            if (progress < 1) {
                                requestAnimationFrame(step);
                            } else {
                                curX = tx; curY = ty;
                                resolve();
                            }
                        }
                        requestAnimationFrame(step);
                    });
                },
                click: () => {
                    cur.style.transform = 'scale(0.85)';
                    rip.style.left = curX + 'px';
                    rip.style.top = curY + 'px';
                    rip.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
                    rip.style.transform = 'translate(-50%,-50%) scale(1.6)';
                    rip.style.opacity = '1';
                    setTimeout(() => {
                        cur.style.transform = 'scale(1)';
                        rip.style.opacity = '0';
                        rip.style.transform = 'translate(-50%,-50%) scale(0)';
                    }, 350);
                },
                scrollTo: (targetY, duration = 800) => {
                    return new Promise(resolve => {
                        const startY = window.scrollY;
                        const startTime = performance.now();
                        function step(now) {
                            const elapsed = now - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            const ease = 1 - Math.pow(1 - progress, 3);
                            window.scrollTo(0, startY + (targetY - startY) * ease);
                            if (progress < 1) {
                                requestAnimationFrame(step);
                            } else {
                                window.scrollTo(0, targetY);
                                resolve();
                            }
                        }
                        requestAnimationFrame(step);
                    });
                },
                showToast: (text) => {
                    if (toastText) toastText.textContent = text;
                    if (toast) {
                        toast.style.transform = 'translateY(0)';
                        toast.style.opacity = '1';
                        setTimeout(() => {
                            toast.style.transform = 'translateY(100px)';
                            toast.style.opacity = '0';
                        }, 3500);
                    }
                },
                showKeyword: (text, icon = '⚡', duration = 3800) => {
                    if (!kw) return;
                    if (kwIcon) kwIcon.textContent = icon;
                    if (kwText) kwText.textContent = text;
                    requestAnimationFrame(() => {
                        kw.style.transform = 'translateX(0) scale(1)';
                        kw.style.opacity = '1';
                    });
                    if (window._kwTimer) clearTimeout(window._kwTimer);
                    window._kwTimer = setTimeout(() => {
                        kw.style.transform = 'translateY(-20px) scale(0.92)';
                        kw.style.opacity = '0';
                    }, duration);
                },
                flashTransition: () => {
                    const fl = document.createElement('div');
                    fl.style.position = 'fixed';
                    fl.style.inset = '0';
                    fl.style.background = 'radial-gradient(circle at 50% 50%, rgba(62,230,196,0.22) 0%, rgba(138,108,255,0.1) 60%, transparent 85%)';
                    fl.style.pointerEvents = 'none';
                    fl.style.zIndex = '99999990';
                    fl.style.opacity = '0';
                    fl.style.transition = 'opacity 0.35s ease-out';
                    document.body.appendChild(fl);
                    requestAnimationFrame(() => {
                        fl.style.opacity = '1';
                        setTimeout(() => {
                            fl.style.transition = 'opacity 0.45s ease-in';
                            fl.style.opacity = '0';
                            setTimeout(() => fl.remove(), 500);
                        }, 250);
                    });
                }
            };
        })()''')

        # Record exact timestamp when Scene 1 starts
        t_action_start = time.time()
        trim_offset = t_action_start - t_video_start
        print(f"Action timeline begins! Trim offset from start of video file: {trim_offset:.3f}s")
        with open("/home/astra/vint2/proj/vk_wall_searcher_php/video_production/timing_offset.json", "w") as f:
            json.dump({"trim_offset": trim_offset}, f)

        def elapsed():
            return time.time() - t_action_start

        def wait_until(target_sec):
            rem = target_sec - elapsed()
            if rem > 0:
                time.sleep(rem)

        # =========================================================================
        # SCENE 1: Intro Splash Screen & Welcome (0:00 - 22.25s)
        # =========================================================================
        print(f"[{elapsed():.2f}s] --- SCENE 1: Intro Splash & Welcome (Target end: 22.25s) ---")
        
        # Inject Stylish Motion Splash Screen
        page.evaluate('''() => {
            const splash = document.createElement('div');
            splash.id = 'vd-splash-overlay';
            splash.style.position = 'fixed';
            splash.style.inset = '0';
            splash.style.zIndex = '99999990';
            splash.style.background = 'radial-gradient(circle at 50% 45%, #0e1738 0%, #060918 100%)';
            splash.style.display = 'flex';
            splash.style.flexDirection = 'column';
            splash.style.alignItems = 'center';
            splash.style.justifyContent = 'center';
            splash.style.overflow = 'hidden';
            splash.style.fontFamily = "'Montserrat', sans-serif";
            splash.innerHTML = `
                <!-- Ambient Aurora Orbs -->
                <div style="position:absolute; top:12%; left:18%; width:480px; height:480px; border-radius:50%; background:#3EE6C4; filter:blur(130px); opacity:0.35;"></div>
                <div style="position:absolute; bottom:12%; right:18%; width:480px; height:480px; border-radius:50%; background:#8A6CFF; filter:blur(130px); opacity:0.35;"></div>

                <!-- Center Glassmorphic Card -->
                <div id="vd-splash-card" style="position:relative; z-index:2; background:rgba(14,21,47,0.78); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border:1.5px solid rgba(62,230,196,0.5); border-radius:28px; padding:46px 64px; text-align:center; box-shadow:0 25px 60px rgba(0,0,0,0.8), 0 0 50px rgba(62,230,196,0.25); max-width:980px; transform:scale(0.92); opacity:0; transition:all 0.8s cubic-bezier(0.16, 1, 0.3, 1);">
                    <!-- Top Pill Badge -->
                    <div style="display:inline-flex; align-items:center; gap:10px; padding:8px 24px; background:rgba(62,230,196,0.12); border:1px solid rgba(62,230,196,0.5); border-radius:999px; color:#3EE6C4; font-size:13.5px; font-weight:700; letter-spacing:0.12em; margin-bottom:24px; box-shadow:0 0 20px rgba(62,230,196,0.2);">
                        <span>🏛️ МБУК «ЦГБ» Г. ВЛАДИМИРА</span>
                        <span style="opacity:0.6;">•</span>
                        <span>ОФИЦИАЛЬНЫЙ СЕРВИС МОНИТОРИНГА</span>
                    </div>

                    <!-- Crest Icon -->
                    <div style="width:76px; height:76px; border-radius:20px; background:linear-gradient(135deg, #3EE6C4 0%, #128269 100%); display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto; box-shadow:0 0 35px rgba(62,230,196,0.5);">
                        <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#060918" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                            <path d="m14.5 12.5 2 2"></path>
                        </svg>
                    </div>

                    <!-- Title -->
                    <h1 style="font-size:46px; font-weight:800; line-height:1.2; color:#ffffff; margin:0 0 14px 0; letter-spacing:-0.01em; text-shadow:0 0 35px rgba(62,230,196,0.35);">
                        Мониторинг публикаций ВКонтакте
                    </h1>

                    <!-- Subtitle -->
                    <p style="font-size:19px; color:#94a3b8; margin:0 0 32px 0; line-height:1.5; font-weight:500;">
                        Интеллектуальный поиск по 16 филиалам • Официальные отчёты • Аналитика вовлечённости
                    </p>

                    <!-- Feature Badges -->
                    <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
                        <div style="padding:10px 20px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:12px; color:#f8fafc; font-size:14px; font-weight:600; display:flex; align-items:center; gap:8px;">
                            <span style="color:#3EE6C4;">⚡</span> 16 филиалов в 1 клик
                        </div>
                        <div style="padding:10px 20px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:12px; color:#f8fafc; font-size:14px; font-weight:600; display:flex; align-items:center; gap:8px;">
                            <span style="color:#8A6CFF;">⏱️</span> Экономия часов работы
                        </div>
                        <div style="padding:10px 20px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:12px; color:#f8fafc; font-size:14px; font-weight:600; display:flex; align-items:center; gap:8px;">
                            <span style="color:#38bdf8;">📊</span> Готовые отчёты Word / Excel
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(splash);

            requestAnimationFrame(() => {
                const card = document.getElementById('vd-splash-card');
                if (card) {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                }
            });
        }''')

        # 0.0 -> 4.8s: Splash Screen plays, voice greets audience
        wait_until(4.8)
        # Smooth dissolve transition from Splash Screen into the live application
        page.evaluate('''() => {
            const splash = document.getElementById('vd-splash-overlay');
            if (splash) {
                splash.style.transition = 'opacity 0.9s ease, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1), filter 0.9s ease';
                splash.style.opacity = '0';
                splash.style.transform = 'scale(1.07)';
                splash.style.filter = 'blur(14px)';
                setTimeout(() => splash.remove(), 950);
            }
        }''')

        # 5.5s -> 9.0s: Glide cursor in to header, show keyword
        wait_until(6.0)
        page.evaluate("VideoDirector.showKeyword('16 библиотечных филиалов Владимира', '🏛️', 4500)")
        page.evaluate("VideoDirector.moveTo(350, 60, 1200)")
        wait_until(8.5)
        page.evaluate("VideoDirector.click()")

        # 12.0s -> 16.0s: Keyword on time saving & glide to branches
        wait_until(13.0)
        page.evaluate("VideoDirector.showKeyword('Экономия десятков часов рутины', '⏱️', 4200)")
        page.evaluate("VideoDirector.moveTo(780, 220, 1200)")
        wait_until(15.5)
        page.evaluate("VideoDirector.click()")

        # 18.0 -> 22.25s: Smooth scroll to search parameters
        wait_until(18.5)
        page.evaluate("VideoDirector.scrollTo(180, 1000)")
        page.evaluate("VideoDirector.moveTo(280, 250, 1000)")
        wait_until(22.25)

        # =========================================================================
        # SCENE 2: Search Parameters (22.25s - 83.11s)
        # =========================================================================
        print(f"[{elapsed():.2f}s] --- SCENE 2: Search Parameters (Target end: 83.11s) ---")
        
        # 22.25 -> 30.0s: Voice talks about 'Искать по всем 16 филиалам'
        wait_until(23.5)
        page.evaluate("VideoDirector.showKeyword('Поиск по всем 16 филиалам сразу', '⚡', 4500)")
        page.evaluate("VideoDirector.moveTo(250, 240, 800)")
        wait_until(26.0)
        page.evaluate('''() => {
            const sw = document.getElementById('use-branches-toggle');
            if (sw) sw.click();
            VideoDirector.click();
        }''')
        
        # Wait showing branch dropdown
        wait_until(30.0)
        page.evaluate("VideoDirector.moveTo(400, 180, 800)")
        wait_until(32.5)
        # Click toggle back ON (all 16 branches)
        page.evaluate('''() => {
            const sw = document.getElementById('use-branches-toggle');
            if (sw) sw.click();
            VideoDirector.click();
        }''')
        
        # 35.0 -> 48.0s: Period selection (Quarter, months)
        wait_until(36.5)
        page.evaluate("VideoDirector.showKeyword('Гибкий выбор: кварталы, месяцы и годы', '📅', 4800)")
        page.evaluate("VideoDirector.scrollTo(280, 800)")
        page.evaluate("VideoDirector.moveTo(380, 220, 800)")
        wait_until(40.0)
        # Click "I кв." chip
        page.evaluate('''() => {
            const btn = Array.from(document.querySelectorAll('.period-chip')).find(el => el.textContent.includes('I кв.'));
            if (btn) btn.click();
            VideoDirector.click();
        }''')
        
        # Move cursor to Month "Март" in grid
        wait_until(45.0)
        page.evaluate("VideoDirector.moveTo(380, 310, 800)")
        wait_until(48.0)
        # Click "Март"
        page.evaluate('''() => {
            const mBtn = Array.from(document.querySelectorAll('.month-card')).find(el => el.textContent.includes('Мар'));
            if (mBtn) mBtn.click();
            VideoDirector.click();
        }''')
        
        # 52.0 -> 70.0s: Keywords input, typing "краеведение", AND/OR toggle
        wait_until(52.5)
        page.evaluate("VideoDirector.showKeyword('Умный поиск: ключевые слова и логика И/ИЛИ', '🔍', 5000)")
        page.evaluate("VideoDirector.scrollTo(350, 800)")
        page.evaluate("VideoDirector.moveTo(250, 330, 700)")
        wait_until(55.0)
        page.evaluate('''() => {
            const inp = document.getElementById('keyword-input');
            if (inp) inp.focus();
            VideoDirector.click();
        }''')
        
        # Type character by character: "краеведение"
        text_to_type = "краеведение"
        for i, char in enumerate(text_to_type):
            wait_until(57.0 + i * 0.28)
            page.evaluate(f'''() => {{
                const inp = document.getElementById('keyword-input');
                if (inp) {{
                    inp.value = "{text_to_type[:i+1]}";
                    inp.dispatchEvent(new Event('input', {{ bubbles: true }}));
                }}
            }}''')
        
        # Move to AND / OR buttons
        wait_until(63.0)
        page.evaluate("VideoDirector.moveTo(360, 330, 600)")
        wait_until(65.0)
        page.evaluate('''() => {
            const andBtn = document.querySelector('.and-or-btn[data-mode="AND"]');
            if (andBtn) andBtn.click();
            VideoDirector.click();
        }''')
        wait_until(68.0)
        page.evaluate('''() => {
            const orBtn = document.querySelector('.and-or-btn[data-mode="OR"]');
            if (orBtn) orBtn.click();
            VideoDirector.click();
        }''')
        
        # 71.0 -> 83.11s: Smart content filters ("Без репостов", "Только с фото")
        wait_until(71.5)
        page.evaluate("VideoDirector.showKeyword('Фильтры: без репостов • только с фото', '🎯', 5000)")
        page.evaluate("VideoDirector.scrollTo(350, 800)")
        page.evaluate("VideoDirector.moveTo(680, 480, 800)")
        wait_until(74.0)
        # Click "Без репостов"
        page.evaluate('''() => {
            const card = document.getElementById('card-exclude-reposts');
            if (card) {
                card.click();
                VideoDirector.click();
            }
        }''')
        
        wait_until(77.5)
        page.evaluate("VideoDirector.moveTo(260, 480, 800)")
        wait_until(79.5)
        # Click "Только с фото"
        page.evaluate('''() => {
            const card = document.getElementById('card-only-photos');
            if (card) {
                card.click();
                VideoDirector.click();
            }
        }''')
        
        # Move cursor to Big Search Button
        wait_until(81.5)
        page.evaluate("VideoDirector.moveTo(500, 650, 800)")
        wait_until(83.11)

        # =========================================================================
        # SCENE 3: Search Execution & Visual Feed (83.11s - 121.39s)
        # =========================================================================
        print(f"[{elapsed():.2f}s] --- SCENE 3: Search & Feed (Target end: 121.39s) ---")
        
        # 83.11 -> 85.0s: Hover and Click big search button
        wait_until(84.0)
        page.evaluate("VideoDirector.flashTransition()")
        page.evaluate("VideoDirector.click()")
        
        # Open Scanning Progress Modal with live animated progress
        page.evaluate('''() => {
            const overlay = document.getElementById('search-modal-overlay');
            if (overlay) {
                overlay.classList.remove('hidden');
                overlay.classList.add('active');
                overlay.style.display = 'flex';
            }
            const bar = document.getElementById('modal-search-progress');
            if (bar) bar.style.width = '0%';
            const badge = document.getElementById('modal-matched-badge');
            if (badge) badge.textContent = '0 записей найдено';
            const log = document.getElementById('modal-search-details');
            if (log) log.innerHTML = 'Инициализация пакетного сканирования 16 филиалов...';
            VideoDirector.moveTo(960, 540, 600);
        }''')
        
        wait_until(86.0)
        page.evaluate("VideoDirector.showKeyword('Пакетное сканирование VK в реальном времени', '🚀', 5500)")

        # Animate progress from 0% to 100% over 12 seconds
        scan_steps = [
            (86.5, "18%", "16 записей найдено", "Опрос Центральной городской библиотеки..."),
            (89.0, "38%", "45 записей найдено", "Опрос филиалов №1, №2 им. Пушкина, №3..."),
            (92.0, "64%", "88 записей найдено", "Опрос филиалов №4, №5, №6, №7, №8..."),
            (95.0, "88%", "124 записи найдено", "Опрос филиалов №9-№14, сбор публикаций..."),
            (98.0, "100%", "148 записей найдено", "✓ Сканирование 16 филиалов успешно завершено!"),
        ]
        for t_step, pct, count_txt, msg_txt in scan_steps:
            wait_until(t_step)
            page.evaluate(f'''() => {{
                const bar = document.getElementById('modal-search-progress');
                if (bar) bar.style.width = '{pct}';
                const badge = document.getElementById('modal-matched-badge');
                if (badge) badge.textContent = '{count_txt}';
                const log = document.getElementById('modal-search-details');
                if (log) log.innerHTML = '{msg_txt}';
            }}''')

        # 101.0s: Close modal and render full results in Feed and Report
        wait_until(101.0)
        page.evaluate("VideoDirector.flashTransition()")
        page.evaluate('''() => {
            const overlay = document.getElementById('search-modal-overlay');
            if (overlay) {
                overlay.classList.remove('active');
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
            }

            // Unhide results section
            const sec = document.getElementById('results-section');
            if (sec) {
                sec.classList.remove('hidden');
                sec.style.display = 'block';
            }

            // Update tab badges
            const cVis = document.getElementById('count-visual');
            if (cVis) cVis.textContent = '148';
            const cRep = document.getElementById('count-report');
            if (cRep) cRep.textContent = '148';

            // Switch to Visual Feed tab
            const tab1 = document.querySelector('.tab-btn[data-tab="visual-tab"]');
            if (tab1) tab1.click();

            // Populate Posts Grid with rich visual cards
            const grid = document.getElementById('posts-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="post-card" id="demo-card-1" style="cursor:pointer; border:1px solid rgba(62,230,196,0.3); background:rgba(14,21,47,0.85); border-radius:18px; padding:24px; box-shadow:0 10px 40px rgba(0,0,0,0.5);">
                        <div class="post-header" style="display:flex; align-items:center; gap:14px; margin-bottom:16px;">
                            <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, #3EE6C4, #128269); display:flex; align-items:center; justify-content:center; color:#060918; font-weight:800; font-size:17px; box-shadow:0 0 15px rgba(62,230,196,0.4);">ЦГБ</div>
                            <div>
                                <div style="font-weight:700; color:#ffffff; font-size:16px;">Центральная городская библиотека</div>
                                <div style="color:#94a3b8; font-size:13.5px;">10 сентября 2026 в 14:00 • ул. Суздальская, 2</div>
                            </div>
                        </div>
                        <div class="post-text" style="color:#f8fafc; font-size:15px; line-height:1.65; margin-bottom:16px;">
                            В Центральной городской библиотеке состоялся краеведческий вечер «Владимир сквозь века». Читатели познакомились с уникальными архивными фотодокументами, редкими изданиями XIX века и историей древних улиц нашего города.
                        </div>
                        <div style="height:170px; background:linear-gradient(135deg, rgba(62,230,196,0.2), rgba(138,108,255,0.2)); border:1px solid rgba(62,230,196,0.35); border-radius:14px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#3EE6C4; font-weight:700; gap:8px;">
                            <span style="font-size:36px;">📷</span>
                            <span style="font-size:16px;">Фотовыставка «Владимир сквозь века» (6 архивных фото)</span>
                        </div>
                        <div class="post-footer" style="display:flex; gap:24px; margin-top:18px; color:#cbd5e1; font-size:14px; font-weight:600;">
                            <span style="color:#ff6b81;">❤️ 42</span>
                            <span style="color:#3EE6C4;">🔄 12</span>
                            <span style="color:#94a3b8;">👁️ 1 540</span>
                            <span style="color:#8A6CFF;">💬 5</span>
                        </div>
                    </div>
                `;
            }
            
            // Populate Report Table with 10 sentences text & expander button
            const repCont = document.getElementById('report-tables-container');
            if (repCont) {
                repCont.innerHTML = `
                    <div class="report-group-section expanded" style="margin-bottom:30px; border:1px solid rgba(62,230,196,0.3); border-radius:16px; background:rgba(14,21,47,0.85); overflow:hidden;">
                        <div class="report-group-title" style="padding:16px 24px; background:rgba(62,230,196,0.12); display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(62,230,196,0.25);">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <span style="font-size:22px;">🏛️</span>
                                <strong style="color:#ffffff; font-size:16px;">Центральная городская библиотека (ул. Суздальская, 2)</strong>
                            </div>
                            <span style="background:#3EE6C4; color:#060918; padding:4px 14px; border-radius:999px; font-weight:700; font-size:13px;">18 публикаций</span>
                        </div>
                        <div class="table-responsive" style="padding:16px;">
                            <table class="report-table" style="width:100%; border-collapse:collapse; color:#f8fafc; font-size:14px;">
                                <thead>
                                    <tr style="border-bottom:2px solid rgba(62,230,196,0.3); text-align:left; color:#3EE6C4;">
                                        <th style="padding:10px; width:15%;">Дата</th>
                                        <th style="padding:10px; width:22%;">Ссылка на запись</th>
                                        <th style="padding:10px; width:51%;">Текст публикации (сокращено до 10 предложений)</th>
                                        <th style="padding:10px; width:12%; text-align:center;">Охват</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
                                        <td style="padding:14px 10px; font-weight:600;">10.09.2026</td>
                                        <td style="padding:14px 10px;">
                                            <a href="https://vk.com/wall-123456_789" target="_blank" style="color:#3EE6C4; text-decoration:underline;">vk.com/wall-123456_789</a>
                                        </td>
                                        <td style="padding:14px 10px;">
                                            <div class="report-post-text-wrap" style="display:flex; flex-direction:column; gap:8px;">
                                                <div id="demo-preview-text" style="line-height:1.65; color:#e2e8f0;">
                                                    1. В Центральной городской библиотеке состоялся краеведческий вечер «Владимир сквозь века». 2. Участники познакомились с уникальными архивными фотодокументами. 3. Экспозиция вызвала неподдельный интерес у исследователей старины. 4. Заведующая отделом краеведения представила редкие издания XIX века. 5. Гости встречи совершили виртуальную экскурсию по старинным улицам губернского центра. 6. Особое внимание уделили истории храмов и гражданской архитектуры. 7. Школьники и студенты приняли участие в тематической исторической викторине. 8. Победители получили памятные краеведческие сборники и открытки. 9. Встреча завершилась чаепитием и обсуждением будущих лекций. 10. Ждём всех любителей истории родного края в следующий четверг!
                                                </div>
                                                <div id="demo-full-text" style="display:none; line-height:1.65; color:#e2e8f0; border-top:1px dashed rgba(62,230,196,0.3); padding-top:8px;">
                                                    11. Напоминаем, что фонд редкой книги доступен для читателей ежедневно с 10:00 до 19:00. 12. Для записи на индивидуальные консультации обращайтесь по телефону 8 (4922) 53-24-56. 13. Также благодарим Государственный архив Владимирской области за содействие в организации выставки. 14. Следите за анонсами следующих встреч на нашем сайте и в социальных сетях.
                                                </div>
                                                <button type="button" id="demo-expand-btn" class="btn-report-expand-text" style="align-self:flex-start; margin-top:4px;">
                                                    <span class="icon">expand_more</span> Развернуть полностью
                                                </button>
                                            </div>
                                        </td>
                                        <td style="padding:14px 10px; text-align:center;">
                                            <div style="display:flex; flex-direction:column; gap:4px; font-size:12px;">
                                                <span style="color:#ff6b81;">❤️ 42</span>
                                                <span style="color:#3EE6C4;">🔄 12</span>
                                                <span style="color:#94a3b8;">👁️ 1.5K</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;

                const btn = document.getElementById('demo-expand-btn');
                const full = document.getElementById('demo-full-text');
                if (btn && full) {
                    btn.addEventListener('click', () => {
                        const isExp = full.style.display !== 'none';
                        if (isExp) {
                            full.style.display = 'none';
                            btn.classList.remove('is-expanded');
                            btn.innerHTML = '<span class="icon">expand_more</span> Развернуть полностью';
                        } else {
                            full.style.display = 'block';
                            btn.classList.add('is-expanded');
                            btn.innerHTML = '<span class="icon">expand_less</span> Свернуть';
                        }
                    });
                }
            }

            // Populate Analytics tab
            const anSec = document.getElementById('analytics-tab');
            if (anSec) {
                anSec.innerHTML = `
                    <div style="padding:24px; max-width:1300px; margin:auto;">
                        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; margin-bottom:24px;">
                            <div style="background:rgba(14,21,47,0.85); border:1px solid rgba(62,230,196,0.3); border-radius:14px; padding:20px; text-align:center;">
                                <div style="color:#94a3b8; font-size:13px; font-weight:600; text-transform:uppercase;">Всего публикаций</div>
                                <div style="color:#3EE6C4; font-size:36px; font-weight:800; margin-top:6px;">148</div>
                            </div>
                            <div style="background:rgba(14,21,47,0.85); border:1px solid rgba(138,108,255,0.3); border-radius:14px; padding:20px; text-align:center;">
                                <div style="color:#94a3b8; font-size:13px; font-weight:600; text-transform:uppercase;">Коэффициент ER</div>
                                <div style="color:#8A6CFF; font-size:36px; font-weight:800; margin-top:6px;">4.82%</div>
                            </div>
                            <div style="background:rgba(14,21,47,0.85); border:1px solid rgba(255,107,129,0.3); border-radius:14px; padding:20px; text-align:center;">
                                <div style="color:#94a3b8; font-size:13px; font-weight:600; text-transform:uppercase;">Сумма лайков</div>
                                <div style="color:#ff6b81; font-size:36px; font-weight:800; margin-top:6px;">1 840</div>
                            </div>
                            <div style="background:rgba(14,21,47,0.85); border:1px solid rgba(56,189,248,0.3); border-radius:14px; padding:20px; text-align:center;">
                                <div style="color:#94a3b8; font-size:13px; font-weight:600; text-transform:uppercase;">Сумма просмотров</div>
                                <div style="color:#38bdf8; font-size:36px; font-weight:800; margin-top:6px;">42 500</div>
                            </div>
                        </div>
                        <div style="background:rgba(14,21,47,0.85); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:20px;">
                            <h4 style="color:#ffffff; margin:0 0 16px 0; font-size:16px; font-weight:700;">Рейтинг филиалов и выполнение нормы публикаций</h4>
                            <table style="width:100%; border-collapse:collapse; color:#f8fafc; font-size:14px;">
                                <thead>
                                    <tr style="border-bottom:2px solid rgba(62,230,196,0.3); text-align:left; color:#3EE6C4;">
                                        <th style="padding:10px;">Место</th>
                                        <th style="padding:10px;">Филиал библиотеки</th>
                                        <th style="padding:10px; text-align:center;">Постов</th>
                                        <th style="padding:10px; text-align:center;">ER</th>
                                        <th style="padding:10px; text-align:right;">Статус нормы</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                                        <td style="padding:12px 10px; font-weight:700; color:#3EE6C4;">🥇 1</td>
                                        <td style="padding:12px 10px; font-weight:600;">Центральная городская библиотека</td>
                                        <td style="padding:12px 10px; text-align:center; font-weight:700;">18</td>
                                        <td style="padding:12px 10px; text-align:center; color:#8A6CFF; font-weight:700;">5.4%</td>
                                        <td style="padding:12px 10px; text-align:right;"><span style="background:rgba(34,197,94,0.2); color:#4ade80; border:1px solid rgba(34,197,94,0.4); padding:4px 12px; border-radius:999px; font-weight:700; font-size:12.5px;">✓ Норма выполнена (180%)</span></td>
                                    </tr>
                                    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                                        <td style="padding:12px 10px; font-weight:700; color:#cbd5e1;">🥈 2</td>
                                        <td style="padding:12px 10px; font-weight:600;">Филиал № 2 им. А.С. Пушкина</td>
                                        <td style="padding:12px 10px; text-align:center; font-weight:700;">14</td>
                                        <td style="padding:12px 10px; text-align:center; color:#8A6CFF; font-weight:700;">4.9%</td>
                                        <td style="padding:12px 10px; text-align:right;"><span style="background:rgba(34,197,94,0.2); color:#4ade80; border:1px solid rgba(34,197,94,0.4); padding:4px 12px; border-radius:999px; font-weight:700; font-size:12.5px;">✓ Норма выполнена (140%)</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            // Populate Summary tab with official memo
            const sumSec = document.getElementById('summary-tab');
            if (sumSec) {
                sumSec.innerHTML = `
                    <div style="padding:24px; max-width:1100px; margin:auto; background:rgba(14,21,47,0.85); border:1px solid rgba(62,230,196,0.3); border-radius:18px; box-shadow:0 10px 40px rgba(0,0,0,0.5);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:16px;">
                            <div>
                                <h3 style="color:#ffffff; margin:0 0 4px 0; font-size:18px;">Методическая справка-отчёт по итогам мониторинга</h3>
                                <div style="color:#94a3b8; font-size:13px;">Период: 2026 год • Тема: «краеведение» • 16 филиалов</div>
                            </div>
                            <button id="demo-btn-copy-memo" style="padding:11px 22px; background:#3EE6C4; color:#060918; border:none; border-radius:10px; font-weight:700; font-size:14px; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 0 20px rgba(62,230,196,0.4);">
                                <span>📋 Скопировать записку</span>
                            </button>
                        </div>
                        <div style="background:rgba(6,9,24,0.6); border-radius:12px; padding:20px; color:#f8fafc; font-size:15px; line-height:1.7; font-family:'Roboto',sans-serif;">
                            <p style="margin:0 0 12px 0;"><strong>АНАЛИТИЧЕСКАЯ СПРАВКА</strong><br>о публикационной активности филиалов МБУК «ЦГБ» г. Владимира по направлению «Краеведение»</p>
                            <p style="margin:0 0 12px 0;">За отчетный период учреждениями библиотечной системы города Владимира было подготовлено и опубликовано в социальной сети ВКонтакте <strong>148 авторских материалов</strong> краеведческой направленности. Суммарный охват публикаций составил более <strong>42 500 просмотров</strong>, зафиксировано <strong>1 840 отметок «Нравится»</strong> и <strong>380 репостов</strong>.</p>
                            <p style="margin:0 0 12px 0;">Лидерами по информационной активности и вовлечённости читательской аудитории признаны: <em>Центральная городская библиотека (18 постов, ER 5.4%)</em>, <em>Филиал № 2 им. А.С. Пушкина (14 постов, ER 4.9%)</em> и <em>Филиал № 8 (12 постов, ER 4.6%)</em>. Установленный норматив выполнен всеми 16 подразделениями.</p>
                            <p style="margin:0; color:#3EE6C4; font-weight:600;">Ключевые хэштеги: #Владимир #краеведение #историягорода #библиотека33 #редкаякнига</p>
                        </div>
                    </div>
                `;
            }
        }''')

        # 102.0 -> 110.0s: Scroll to Visual Feed
        wait_until(102.5)
        page.evaluate("VideoDirector.showKeyword('148 публикаций • Паспорт и метрики поста', '📱', 4800)")
        page.evaluate('''() => {
            document.getElementById('posts-grid').scrollIntoView({ behavior: 'smooth', block: 'center' });
            VideoDirector.moveTo(550, 480, 800);
        }''')
        
        # 110.0 -> 118.0s: Click first post card to open Quick View modal
        wait_until(110.0)
        page.evaluate("VideoDirector.showKeyword('Быстрый просмотр и переход к записи VK', '👁️', 4800)")
        page.evaluate('''() => {
            VideoDirector.click();
            const pm = document.getElementById('post-modal');
            if (pm) {
                pm.classList.add('pm-open');
                pm.classList.remove('hidden');
                pm.style.display = 'flex';
                pm.style.visibility = 'visible';
                pm.style.opacity = '1';
            }
            const content = document.getElementById('post-modal-content');
            if (content) {
                content.innerHTML = `
                    <div style="background:#0e152f; border:1px solid #3EE6C4; border-radius:16px; padding:28px; max-width:700px; margin:auto; box-shadow:0 20px 60px rgba(0,0,0,0.85);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
                            <div>
                                <h3 style="color:#ffffff; margin:0 0 4px 0; font-family:'Montserrat',sans-serif; font-size:18px;">Центральная городская библиотека</h3>
                                <span style="color:#3EE6C4; font-size:13px; font-weight:600;">10 сентября 2026 • 14:00</span>
                            </div>
                            <button id="demo-modal-close" style="background:rgba(255,255,255,0.1); border:none; color:#ffffff; width:36px; height:36px; border-radius:50%; font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center;">&times;</button>
                        </div>
                        <p style="color:#f8fafc; font-size:15.5px; line-height:1.65; margin-bottom:20px;">
                            В Центральной городской библиотеке состоялся краеведческий вечер «Владимир сквозь века». Читатели познакомились с уникальными архивными фотодокументами, редкими книжными изданиями XIX века и архитектурной историей древнего Владимира.
                        </p>
                        <div style="display:flex; gap:14px; margin-top:24px;">
                            <button id="demo-btn-open-vk" style="padding:11px 20px; background:#3EE6C4; color:#060918; border:none; border-radius:10px; font-weight:700; font-size:14px; cursor:pointer; display:flex; align-items:center; gap:8px;">
                                <span>Открыть запись ВКонтакте ↗</span>
                            </button>
                            <button id="demo-btn-copy-post" style="padding:11px 20px; background:rgba(255,255,255,0.08); color:#f8fafc; border:1px solid rgba(255,255,255,0.25); border-radius:10px; font-weight:600; font-size:14px; cursor:pointer;">
                                Скопировать текст
                            </button>
                        </div>
                    </div>
                `;
            }
        }''')
        
        wait_until(112.5)
        page.evaluate("VideoDirector.moveTo(750, 680, 700)")
        wait_until(115.0)
        page.evaluate("VideoDirector.moveTo(1250, 320, 600)")
        wait_until(117.5)
        # Click close button (×)
        page.evaluate('''() => {
            VideoDirector.click();
            const pm = document.getElementById('post-modal');
            if (pm) {
                pm.classList.remove('pm-open');
                pm.style.display = 'none';
            }
        }''')
        wait_until(121.39)

        # =========================================================================
        # SCENE 4: Report with Links & 10 Sentences Truncation (121.39s - 165.36s)
        # =========================================================================
        print(f"[{elapsed():.2f}s] --- SCENE 4: Report Tab & Truncation (Target end: 165.36s) ---")
        
        # 121.39 -> 126.0s: Move to Tab 2 "Отчёт с ссылками" and click
        wait_until(122.5)
        page.evaluate("VideoDirector.flashTransition()")
        page.evaluate('''() => {
            document.querySelector('.tab-btn[data-tab="report-tab"]').scrollIntoView({ behavior: 'smooth', block: 'center' });
            VideoDirector.moveTo(420, 240, 800);
        }''')
        wait_until(125.0)
        page.evaluate('''() => {
            const tab2 = document.querySelector('.tab-btn[data-tab="report-tab"]');
            if (tab2) tab2.click();
            VideoDirector.click();
        }''')
        
        # 126.0 -> 138.0s: Smooth scroll to report table
        wait_until(127.0)
        page.evaluate("VideoDirector.showKeyword('Официальный отчёт с группировкой по филиалам', '📊', 4800)")
        page.evaluate('''() => {
            document.getElementById('report-document').scrollIntoView({ behavior: 'smooth', block: 'start' });
            VideoDirector.moveTo(600, 420, 1000);
        }''')
        
        # 138.0 -> 148.0s: Voice explains 10 sentences truncation and "Развернуть полностью"
        wait_until(139.0)
        page.evaluate("VideoDirector.showKeyword('Сжатие текста: бережно до 10 предложений', '✂️', 4500)")
        page.evaluate("VideoDirector.moveTo(680, 600, 800)")
        wait_until(143.0)
        # Click "Развернуть полностью"
        page.evaluate('''() => {
            const btn = document.getElementById('demo-expand-btn');
            if (btn) btn.click();
            VideoDirector.click();
        }''')
        
        # Hold expanded text for viewer
        wait_until(145.5)
        page.evaluate("VideoDirector.showKeyword('Интерактивная кнопка «Развернуть полностью»', '🔄', 4000)")
        wait_until(149.0)
        # Click "Свернуть" back
        page.evaluate('''() => {
            const btn = document.getElementById('demo-expand-btn');
            if (btn) btn.click();
            VideoDirector.click();
        }''')
        
        # 153.0 -> 165.36s: Move up to export toolbar (Word, CSV, HTML, Print)
        wait_until(153.5)
        page.evaluate("VideoDirector.showKeyword('Экспорт в 1 клик: Word • Excel CSV • HTML • Печать', '📥', 5000)")
        page.evaluate('''() => {
            document.querySelector('.report-controls').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }''')
        
        # Sweep across export buttons
        wait_until(155.0)
        page.evaluate("VideoDirector.moveTo(680, 320, 700)") # Word
        wait_until(157.5)
        page.evaluate("VideoDirector.click()")
        
        wait_until(158.5)
        page.evaluate("VideoDirector.moveTo(560, 320, 600)") # CSV
        wait_until(160.5)
        page.evaluate("VideoDirector.click()")
        
        wait_until(161.5)
        page.evaluate("VideoDirector.moveTo(820, 320, 600)") # HTML
        wait_until(163.5)
        page.evaluate("VideoDirector.moveTo(920, 320, 600)") # Print
        wait_until(165.36)

        # =========================================================================
        # SCENE 5: Analytics & Methodist Memo (165.36s - 194.81s)
        # =========================================================================
        print(f"[{elapsed():.2f}s] --- SCENE 5: Analytics & Memo (Target end: 194.81s) ---")
        
        # 165.36 -> 172.0s: Click "Аналитика" tab
        wait_until(166.5)
        page.evaluate("VideoDirector.flashTransition()")
        page.evaluate('''() => {
            document.querySelector('.tab-btn[data-tab="analytics-tab"]').scrollIntoView({ behavior: 'smooth', block: 'center' });
            VideoDirector.moveTo(580, 200, 700);
        }''')
        wait_until(168.0)
        page.evaluate('''() => {
            const tab3 = document.querySelector('.tab-btn[data-tab="analytics-tab"]');
            if (tab3) tab3.click();
            VideoDirector.click();
        }''')
        
        # 172.0 -> 180.0s: Scroll through Analytics KPI cards and table
        wait_until(170.0)
        page.evaluate("VideoDirector.showKeyword('Расчёт вовлечённости ER и рейтинг филиалов', '📈', 4800)")
        wait_until(171.0)
        page.evaluate('''() => {
            document.getElementById('analytics-tab').scrollIntoView({ behavior: 'smooth', block: 'start' });
            VideoDirector.moveTo(600, 360, 800);
        }''')
        wait_until(175.0)
        page.evaluate("VideoDirector.moveTo(950, 480, 800)")
        
        # 180.0 -> 194.81s: Switch to "Справка" (Методическая записка) and copy
        wait_until(180.5)
        page.evaluate("VideoDirector.flashTransition()")
        page.evaluate('''() => {
            document.querySelector('.tab-btn[data-tab="summary-tab"]').scrollIntoView({ behavior: 'smooth', block: 'center' });
            VideoDirector.moveTo(720, 200, 700);
        }''')
        wait_until(183.0)
        page.evaluate('''() => {
            const tab4 = document.querySelector('.tab-btn[data-tab="summary-tab"]');
            if (tab4) tab4.click();
            VideoDirector.click();
        }''')
        
        wait_until(184.0)
        page.evaluate("VideoDirector.showKeyword('Готовая методическая записка по итогам', '📋', 4500)")
        wait_until(185.5)
        page.evaluate('''() => {
            document.getElementById('summary-tab').scrollIntoView({ behavior: 'smooth', block: 'start' });
            VideoDirector.moveTo(920, 240, 800);
        }''')
        wait_until(189.5)
        # Click "Скопировать записку" and show Toast notification
        page.evaluate('''() => {
            VideoDirector.click();
            VideoDirector.showToast('Текст методической записки скопирован в буфер обмена!');
        }''')
        wait_until(190.5)
        page.evaluate("VideoDirector.showKeyword('✓ Записка скопирована в буфер обмена', '📋', 3500)")
        wait_until(194.81)

        # =========================================================================
        # SCENE 6: Outro & Conclusion (194.81s - 212.47s)
        # =========================================================================
        print(f"[{elapsed():.2f}s] --- SCENE 6: Outro (Target end: 212.47s) ---")
        
        # Inject elegant outro branded overlay
        page.evaluate("VideoDirector.flashTransition()")
        page.evaluate('''() => {
            const outro = document.createElement('div');
            outro.id = 'vd-outro-overlay';
            outro.style.position = 'fixed';
            outro.style.inset = '0';
            outro.style.background = 'radial-gradient(circle at center, #0e152f 0%, #060918 100%)';
            outro.style.display = 'flex';
            outro.style.flexDirection = 'column';
            outro.style.alignItems = 'center';
            outro.style.justifyContent = 'center';
            outro.style.zIndex = '9999999';
            outro.style.opacity = '0';
            outro.style.transition = 'opacity 1.0s ease';
            outro.innerHTML = `
                <div style="padding:14px 32px; background:rgba(62,230,196,0.12); border:1px solid rgba(62,230,196,0.5); border-radius:999px; color:#3EE6C4; font-family:'Montserrat',sans-serif; font-size:15px; font-weight:700; letter-spacing:0.15em; margin-bottom:24px; box-shadow:0 0 30px rgba(62,230,196,0.25);">
                    МБУК «ЦГБ» Г. ВЛАДИМИРА • СЕРВИС МОНИТОРИНГА
                </div>
                <h1 style="font-family:'Montserrat',sans-serif; font-size:56px; font-weight:800; color:#ffffff; text-align:center; margin:0 0 16px 0; text-shadow:0 0 40px rgba(62,230,196,0.4);">
                    Экономьте часы рутинной работы
                </h1>
                <p style="font-family:'Montserrat',sans-serif; font-size:22px; color:#94a3b8; text-align:center; max-width:850px; margin:0 0 40px 0; line-height:1.5;">
                    Мгновенный поиск публикаций по 16 филиалам, умные отчёты и аналитика
                </p>
                <a id="demo-outro-link" href="https://biblioteka33.ru/stat" target="_blank" style="text-decoration:none; padding:18px 44px; background:linear-gradient(135deg, #3EE6C4 0%, #10b981 100%); color:#060918; border-radius:14px; font-family:'Montserrat',sans-serif; font-size:24px; font-weight:800; letter-spacing:0.05em; box-shadow:0 10px 40px rgba(62,230,196,0.5); display:inline-flex; align-items:center; gap:14px; transition:transform 0.3s ease;">
                    <span>biblioteka33.ru/stat</span>
                    <span style="font-size:24px;">↗</span>
                </a>
            `;
            document.body.appendChild(outro);
            requestAnimationFrame(() => {
                outro.style.opacity = '1';
            });
        }''')
        
        wait_until(196.5)
        page.evaluate("VideoDirector.showKeyword('Официальный адрес: biblioteka33.ru/stat', '🌐', 5500)")

        # 195.0 -> 205.0s: Glide cursor to the glowing URL button
        wait_until(198.0)
        page.evaluate("VideoDirector.moveTo(960, 640, 1200)")
        wait_until(202.0)
        # Click glowing link button
        page.evaluate('''() => {
            VideoDirector.click();
            const link = document.getElementById('demo-outro-link');
            if (link) link.style.transform = 'scale(0.96)';
            setTimeout(() => {
                if (link) link.style.transform = 'scale(1.04)';
            }, 180);
        }''')
        
        # 210.0 -> 212.47s: Final fade out to black
        wait_until(210.0)
        page.evaluate('''() => {
            const fade = document.createElement('div');
            fade.style.position = 'fixed';
            fade.style.inset = '0';
            fade.style.background = '#000000';
            fade.style.zIndex = '99999999';
            fade.style.opacity = '0';
            fade.style.transition = 'opacity 2.0s ease';
            document.body.appendChild(fade);
            requestAnimationFrame(() => fade.style.opacity = '1');
        }''')
        
        wait_until(212.5)
        print(f"[{elapsed():.2f}s] Recording complete. Closing browser context to finalize video file...")
        
        context.close()
        browser.close()
        print("Browser closed. Raw screencast video saved.")

if __name__ == "__main__":
    main()
