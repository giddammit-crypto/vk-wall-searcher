/**
 * src/constellations.js — Real Astronomical Constellations & Star Telemetry Engine
 * ============================================================================
 * Разработка: Lead 3D Game Engineer & Astronomical Visualization Specialist
 *
 * Особенности:
 * - 12 реальных астрономических созвездий (Большая и Малая Медведицы, Орион,
 *   Кассиопея, Лебедь, Лира, Орёл, Большой Пёс, Телец, Лев, Скорпион, Пегас).
 * - Реальные астрофизические данные для каждой звезды: прямое восхождение (RA),
 *   склонение (Dec), видимая звездная величина (Mag), спектральный класс (O..M),
 *   температура поверхности в Кельвинах (K), расстояние в световых годах и парсеках,
 *   светимость в светимостях Солнца (L_sun), радиус и масса.
 * - Неоновые линии астеризмов со свечением и эффектом энергетического импульса.
 * - Физически корректные спектральные цвета звезд и дифракционные лучи (Spikes).
 * - Интерактивность: при наведении выделяется фигура созвездия и звезда,
 *   а при клике открывается кибернетическая карточка телеметрии с кнопкой
 *   плавного центрирования 360° камеры прямо на созвездие.
 * ============================================================================
 */

import { SpaceAudio } from './space_audio.js?v=4.21.0';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Расстояние до небесной сферы (px) в координатах Space3D
 */
const SKY_SPHERE_RADIUS = 1000;

/**
 * Каталог 12 реальных созвездий с астрономическими координатами и физическими характеристиками звезд
 */
export const CONSTELLATIONS_CATALOG = [
    {
        id: 'ursa_major',
        nameRu: 'Большая Медведица',
        nameLat: 'Ursa Major',
        genitive: 'Ursae Majoris',
        code: 'UMa',
        starsCount: 7,
        season: 'Северное полушарие • Циркумполярное',
        myth: 'Одно из древнейших созвездий неба. Астеризм Большой Ковш служит ключевым ориентиром для поиска Полярной звезды.',
        stars: [
            { id: 'dubhe', name: 'Дубхе', bayer: 'α UMa', ra: 165.93, dec: 61.75, mag: 1.79, distLy: 123, distPc: 37.7, spectral: 'K0III', tempK: 4500, lum: 316, radius: 30, color: '#fdba74', desc: 'Оранжевый гигант, северная звезда стенки Ковша. Указывает на Полярную звезду.' },
            { id: 'merak', name: 'Мерак', bayer: 'β UMa', ra: 165.46, dec: 56.38, mag: 2.37, distLy: 79.7, distPc: 24.4, spectral: 'A1V', tempK: 9300, lum: 63, radius: 3.0, color: '#ffffff', desc: 'Белая звезда главной последовательности. Вместе с Дубхе образует линию на Полярную.' },
            { id: 'phecda', name: 'Фекда', bayer: 'γ UMa', ra: 178.46, dec: 53.69, mag: 2.44, distLy: 83.2, distPc: 25.5, spectral: 'A0V', tempK: 9500, lum: 71, radius: 3.0, color: '#ffffff', desc: 'Белая звезда в основании чаши Большого Ковша, входит в движущуюся группу Медведицы.' },
            { id: 'megrez', name: 'Мегрец', bayer: 'δ UMa', ra: 183.86, dec: 57.03, mag: 3.31, distLy: 80.5, distPc: 24.7, spectral: 'A3V', tempK: 8630, lum: 14, radius: 1.4, color: '#f8fafc', desc: 'Наименее яркая звезда ковша, соединяющая чашу с ручкой.' },
            { id: 'alioth', name: 'Алиот', bayer: 'ε UMa', ra: 193.51, dec: 55.96, mag: 1.77, distLy: 82.6, distPc: 25.3, spectral: 'A1p', tempK: 9020, lum: 108, radius: 4.1, color: '#ffffff', desc: 'Ярчайшая звезда Большой Медведицы. Пекулярная переменная с сильным магнитным полем.' },
            { id: 'mizar', name: 'Мицар', bayer: 'ζ UMa', ra: 200.98, dec: 54.92, mag: 2.23, distLy: 82.9, distPc: 25.4, spectral: 'A2V', tempK: 9000, lum: 33, radius: 2.4, color: '#ffffff', desc: 'Знаменитая кратная система, образующая с Алькором древнейший тест на остроту зрения.' },
            { id: 'alkaid', name: 'Алькаид', bayer: 'η UMa', ra: 206.89, dec: 49.31, mag: 1.86, distLy: 103.9, distPc: 31.9, spectral: 'B3V', tempK: 15540, lum: 594, radius: 3.4, color: '#93c5fd', desc: 'Горячая бело-голубая звезда на самом конце ручки Ковша.' }
        ],
        lines: [
            ['dubhe', 'merak'],
            ['merak', 'phecda'],
            ['phecda', 'megrez'],
            ['megrez', 'dubhe'],
            ['megrez', 'alioth'],
            ['alioth', 'mizar'],
            ['mizar', 'alkaid']
        ]
    },
    {
        id: 'ursa_minor',
        nameRu: 'Малая Медведица',
        nameLat: 'Ursa Minor',
        genitive: 'Ursae Minoris',
        code: 'UMi',
        starsCount: 5,
        season: 'Северный полюс мира • Навигация',
        myth: 'Полярная звезда находится менее чем в 1 градусе от Северного полюса мира и веками служила главным ориентиром астронавигации.',
        stars: [
            { id: 'polaris', name: 'Полярная звезда', bayer: 'α UMi', ra: 37.95, dec: 89.26, mag: 1.98, distLy: 433, distPc: 132.8, spectral: 'F7Ib', tempK: 6015, lum: 1260, radius: 37, color: '#fef08a', desc: 'Тройная звездная система, сверхгигант цефеида. Указывает строго на север.' },
            { id: 'kochab', name: 'Кохаб', bayer: 'β UMi', ra: 222.68, dec: 74.16, mag: 2.08, distLy: 130.9, distPc: 40.1, spectral: 'K4III', tempK: 4030, lum: 390, radius: 42, color: '#fdba74', desc: 'Оранжевый гигант. Во 2 тысячелетии до н.э. служил полярной звездой древнего мира.' },
            { id: 'pherkad', name: 'Феркад', bayer: 'γ UMi', ra: 230.18, dec: 71.83, mag: 3.05, distLy: 487, distPc: 149.3, spectral: 'A3I', tempK: 8600, lum: 1100, radius: 15, color: '#f8fafc', desc: 'Белый гигант переменной яркости. Вместе с Кохабом называют Стражами Полюса.' },
            { id: 'yildun', name: 'Йилдун', bayer: 'δ UMi', ra: 260.05, dec: 86.59, mag: 4.35, distLy: 183, distPc: 56.1, spectral: 'A1V', tempK: 9000, lum: 47, radius: 2.8, color: '#ffffff', desc: 'Белая звезда в середине ручки Малого Ковша.' },
            { id: 'anwar', name: 'Анвар', bayer: 'η UMi', ra: 244.97, dec: 75.76, mag: 4.95, distLy: 97.3, distPc: 29.8, spectral: 'F5V', tempK: 6400, lum: 7.4, radius: 2.0, color: '#fef08a', desc: 'Желто-белый карлик чаши Малого Ковша.' }
        ],
        lines: [
            ['polaris', 'yildun'],
            ['yildun', 'anwar'],
            ['anwar', 'pherkad'],
            ['pherkad', 'kochab'],
            ['kochab', 'anwar']
        ]
    },
    {
        id: 'orion',
        nameRu: 'Орион',
        nameLat: 'Orion',
        genitive: 'Orionis',
        code: 'Ori',
        starsCount: 7,
        season: 'Экваториальное созвездие • Зима',
        myth: 'Одно из самых ярких и узнаваемых созвездий земного неба с колоссальными сверхгигантами Бетельгейзе и Ригель.',
        stars: [
            { id: 'betelgeuse', name: 'Бетельгейзе', bayer: 'α Ori', ra: 88.79, dec: 7.41, mag: 0.50, distLy: 548, distPc: 168.0, spectral: 'M1-2Ia', tempK: 3600, lum: 126000, radius: 764, color: '#f87171', desc: 'Красный пульсирующий сверхгигант колоссальных размеров. Будущая яркая вспышка сверхновой.' },
            { id: 'rigel', name: 'Ригель', bayer: 'β Ori', ra: 78.63, dec: -8.20, mag: 0.13, distLy: 863, distPc: 264.6, spectral: 'B8Ia', tempK: 12100, lum: 120000, radius: 78, color: '#93c5fd', desc: 'Бело-голубой сверхгигант, ярчайшая звезда созвездия Орион и одна из самых ярких в Галактике.' },
            { id: 'bellatrix', name: 'Беллатрикс', bayer: 'γ Ori', ra: 81.28, dec: 6.35, mag: 1.64, distLy: 250, distPc: 76.6, spectral: 'B2III', tempK: 22000, lum: 9200, radius: 5.7, color: '#67e8f9', desc: 'Горячий сине-белый гигант, левое плечо Небесного Охотника.' },
            { id: 'saiph', name: 'Саиф', bayer: 'κ Ori', ra: 86.94, dec: -9.67, mag: 2.07, distLy: 650, distPc: 199.3, spectral: 'B0.5Ia', tempK: 26500, lum: 56000, radius: 22, color: '#67e8f9', desc: 'Голубой сверхгигант с высокой температурой, правая нога Ориона.' },
            { id: 'alnitak', name: 'Альнитак', bayer: 'ζ Ori', ra: 85.19, dec: -1.94, mag: 1.77, distLy: 1260, distPc: 386.3, spectral: 'O9.5Ib', tempK: 29500, lum: 250000, radius: 20, color: '#67e8f9', desc: 'Восточная звезда Пояса Ориона, горячий сверхгигант спектрального класса O.' },
            { id: 'alnilam', name: 'Альнилам', bayer: 'ε Ori', ra: 84.05, dec: -1.20, mag: 1.69, distLy: 2000, distPc: 613.2, spectral: 'B0Ia', tempK: 27000, lum: 537000, radius: 32, color: '#67e8f9', desc: 'Центральная звезда Пояса Ориона, колоссальный голубой сверхгигант полумиллиона Солнц.' },
            { id: 'mintaka', name: 'Минтака', bayer: 'δ Ori', ra: 83.00, dec: -0.30, mag: 2.23, distLy: 1200, distPc: 367.9, spectral: 'O9.5II', tempK: 29800, lum: 190000, radius: 16, color: '#67e8f9', desc: 'Западная звезда Пояса Ориона, расположена практически точно на небесном экваторе.' }
        ],
        lines: [
            ['betelgeuse', 'bellatrix'],
            ['bellatrix', 'mintaka'],
            ['mintaka', 'alnilam'],
            ['alnilam', 'alnitak'],
            ['alnitak', 'betelgeuse'],
            ['alnitak', 'saiph'],
            ['saiph', 'rigel'],
            ['rigel', 'mintaka']
        ]
    },
    {
        id: 'cassiopeia',
        nameRu: 'Кассиопея',
        nameLat: 'Cassiopeia',
        genitive: 'Cassiopeiae',
        code: 'Cas',
        starsCount: 5,
        season: 'Северное полушарие • Осенне-зимнее',
        myth: 'Легендарный W-образный астеризм северного неба, расположенный в яркой полосе Млечного Пути.',
        stars: [
            { id: 'schedar', name: 'Шедар', bayer: 'α Cas', ra: 10.13, dec: 56.54, mag: 2.24, distLy: 228, distPc: 69.9, spectral: 'K0IIIa', tempK: 4530, lum: 676, radius: 42, color: '#fdba74', desc: 'Оранжевый гигант, ярчайшая звезда созвездия Кассиопея.' },
            { id: 'caph', name: 'Каф', bayer: 'β Cas', ra: 2.29, dec: 59.15, mag: 2.28, distLy: 54.7, distPc: 16.8, spectral: 'F2III', tempK: 7080, lum: 27, radius: 3.5, color: '#f8fafc', desc: 'Желто-белый субгигант переменной яркости типа Дельта Щита.' },
            { id: 'navi', name: 'Нави', bayer: 'γ Cas', ra: 14.18, dec: 60.72, mag: 2.15, distLy: 550, distPc: 168.6, spectral: 'B0.5IVe', tempK: 25000, lum: 34000, radius: 10, color: '#67e8f9', desc: 'Быстровращающаяся переменная звезда с горячим газовым диском, центр W-астеризма.' },
            { id: 'ruchbah', name: 'Рукбах', bayer: 'δ Cas', ra: 19.82, dec: 60.23, mag: 2.68, distLy: 99, distPc: 30.3, spectral: 'A5V', tempK: 8400, lum: 18, radius: 3.9, color: '#ffffff', desc: 'Белая звезда затменно-двойного типа с периодом 759 дней.' },
            { id: 'segin', name: 'Сегин', bayer: 'ε Cas', ra: 26.83, dec: 63.67, mag: 3.35, distLy: 460, distPc: 141.0, spectral: 'B3V', tempK: 15100, lum: 720, radius: 6.0, color: '#93c5fd', desc: 'Бело-голубой гигант восточного крыла буквы W.' }
        ],
        lines: [
            ['caph', 'schedar'],
            ['schedar', 'navi'],
            ['navi', 'ruchbah'],
            ['ruchbah', 'segin']
        ]
    },
    {
        id: 'cygnus',
        nameRu: 'Лебедь (Северный Крест)',
        nameLat: 'Cygnus',
        genitive: 'Cygni',
        code: 'Cyg',
        starsCount: 5,
        season: 'Млечный Путь • Летне-осеннее',
        myth: 'Величественный небесный лебедь, летящий вдоль Млечного Пути. Включает Северный Крест и колоссальный сверхгигант Денеб.',
        stars: [
            { id: 'deneb', name: 'Денеб', bayer: 'α Cyg', ra: 310.36, dec: 45.28, mag: 1.25, distLy: 2615, distPc: 801.7, spectral: 'A2Ia', tempK: 8525, lum: 196000, radius: 203, color: '#ffffff', desc: 'Колоссальный белый сверхгигант, вершина Летнего Треугольника. Одна из мощнейших звезд галактики.' },
            { id: 'albireo', name: 'Альбирео', bayer: 'β Cyg', ra: 292.68, dec: 27.96, mag: 3.05, distLy: 430, distPc: 131.8, spectral: 'K3II', tempK: 4300, lum: 1200, radius: 62, color: '#fdba74', desc: 'Красивейшая оптическая двойная звезда неба: золотистый гигант и сапфировый спутник.' },
            { id: 'sadr', name: 'Садр', bayer: 'γ Cyg', ra: 305.56, dec: 40.26, mag: 2.23, distLy: 1800, distPc: 551.9, spectral: 'F8Ib', tempK: 5790, lum: 33000, radius: 150, color: '#fef08a', desc: 'Желтовато-белый сверхгигант в центре Северного Креста, окруженный туманностью Гамма Лебедя.' },
            { id: 'gienah', name: 'Дженах', bayer: 'ε Cyg', ra: 311.55, dec: 33.97, mag: 2.48, distLy: 73, distPc: 22.4, spectral: 'K0III', tempK: 4710, lum: 62, radius: 11, color: '#fdba74', desc: 'Оранжевый гигант восточного крыла Лебедя.' },
            { id: 'fawaris', name: 'Фаварис', bayer: 'δ Cyg', ra: 296.24, dec: 45.13, mag: 2.87, distLy: 165, distPc: 50.6, spectral: 'B9.5IV', tempK: 10500, lum: 180, radius: 4.7, color: '#93c5fd', desc: 'Тройная звезда западного крыла Лебедя.' }
        ],
        lines: [
            ['deneb', 'sadr'],
            ['sadr', 'albireo'],
            ['fawaris', 'sadr'],
            ['sadr', 'gienah']
        ]
    },
    {
        id: 'lyra',
        nameRu: 'Лира',
        nameLat: 'Lyra',
        genitive: 'Lyrae',
        code: 'Lyr',
        starsCount: 4,
        season: 'Летне-осенний треугольник',
        myth: 'Небольшое, но яркое созвездие с ослепительной Вегой, служившей первым фотоэлектрическим эталоном звездной величины.',
        stars: [
            { id: 'vega', name: 'Вега', bayer: 'α Lyr', ra: 279.23, dec: 38.78, mag: 0.03, distLy: 25.0, distPc: 7.7, spectral: 'A0V', tempK: 9600, lum: 40, radius: 2.36, color: '#ffffff', desc: 'Ярчайшая звезда созвездия Лира, эталон 0-й звездной величины в фотометрии, окружена протопланетным пылевым диском.' },
            { id: 'sheliak', name: 'Шелиак', bayer: 'β Lyr', ra: 282.52, dec: 33.36, mag: 3.52, distLy: 960, distPc: 294.3, spectral: 'B7V', tempK: 13300, lum: 6500, radius: 19, color: '#93c5fd', desc: 'Прототип затменно-переменных звёзд с активным обменом веществом между компонентами.' },
            { id: 'sulafat', name: 'Сулафат', bayer: 'γ Lyr', ra: 284.74, dec: 32.69, mag: 3.25, distLy: 620, distPc: 190.1, spectral: 'B9III', tempK: 10000, lum: 2100, radius: 15, color: '#93c5fd', desc: 'Бело-голубой гигант нижнего угла параллелограмма Лиры.' },
            { id: 'delta_lyr', name: 'Дельта Лиры', bayer: 'δ2 Lyr', ra: 283.77, dec: 36.90, mag: 4.22, distLy: 740, distPc: 226.9, spectral: 'M4II', tempK: 3400, lum: 5400, radius: 160, color: '#f87171', desc: 'Красный яркий гигант верхнего угла параллелограмма.' }
        ],
        lines: [
            ['vega', 'delta_lyr'],
            ['delta_lyr', 'sulafat'],
            ['sulafat', 'sheliak'],
            ['sheliak', 'vega']
        ]
    },
    {
        id: 'aquila',
        nameRu: 'Орёл',
        nameLat: 'Aquila',
        genitive: 'Aquilae',
        code: 'Aql',
        starsCount: 3,
        season: 'Летне-осенний треугольник',
        myth: 'Царственная птица Юпитера. Звезда Альтаир сплюснута центробежными силами из-за рекордного вращения за 9 часов.',
        stars: [
            { id: 'altair', name: 'Альтаир', bayer: 'α Aql', ra: 297.70, dec: 8.87, mag: 0.77, distLy: 16.7, distPc: 5.1, spectral: 'A7V', tempK: 7700, lum: 10.6, radius: 1.8, color: '#ffffff', desc: 'Быстровращающаяся звезда главной последовательности, южная вершина Летнего Треугольника.' },
            { id: 'tarazed', name: 'Таразед', bayer: 'γ Aql', ra: 296.54, dec: 10.61, mag: 2.72, distLy: 395, distPc: 121.1, spectral: 'K3II', tempK: 4210, lum: 2960, radius: 110, color: '#fdba74', desc: 'Яркий оранжевый гигант, северный страж Альтаира.' },
            { id: 'alshain', name: 'Альшаин', bayer: 'β Aql', ra: 298.83, dec: 6.41, mag: 3.71, distLy: 44.7, distPc: 13.7, spectral: 'G8IV', tempK: 5100, lum: 6.0, radius: 3.2, color: '#fef08a', desc: 'Желтый субгигант с красным карликовым спутником.' }
        ],
        lines: [
            ['tarazed', 'altair'],
            ['altair', 'alshain']
        ]
    },
    {
        id: 'canis_major',
        nameRu: 'Большой Пёс',
        nameLat: 'Canis Major',
        genitive: 'Canis Majoris',
        code: 'CMa',
        starsCount: 5,
        season: 'Южное полушарие / Зима',
        myth: 'Содержит Сириус - ярчайшую звезду земного ночного неба, игравшую сакральную роль в календаре Древнего Египта.',
        stars: [
            { id: 'sirius', name: 'Сириус', bayer: 'α CMa', ra: 101.29, dec: -16.72, mag: -1.46, distLy: 8.6, distPc: 2.6, spectral: 'A1V', tempK: 9940, lum: 25.4, radius: 1.71, color: '#ffffff', desc: 'Ярчайшая звезда ночного неба Земли. Имеет спутник Сириус B - первый открытый белый карлик.' },
            { id: 'adhara', name: 'Адара', bayer: 'ε CMa', ra: 104.66, dec: -28.97, mag: 1.50, distLy: 405, distPc: 124.2, spectral: 'B2II', tempK: 22200, lum: 38700, radius: 14, color: '#67e8f9', desc: 'Мощнейший источник экстремального ультрафиолетового излучения на ночном небе.' },
            { id: 'wezen', name: 'Везен', bayer: 'δ CMa', ra: 107.10, dec: -26.39, mag: 1.83, distLy: 1600, distPc: 490.6, spectral: 'F8Ia', tempK: 5800, lum: 82000, radius: 215, color: '#fef08a', desc: 'Желтовато-белый сверхгигант колоссальной светимости.' },
            { id: 'mirzam', name: 'Мирзам', bayer: 'β CMa', ra: 95.67, dec: -17.96, mag: 1.98, distLy: 500, distPc: 153.3, spectral: 'B1II', tempK: 25800, lum: 26600, radius: 9.7, color: '#67e8f9', desc: 'Пульсирующий сине-белый гигант, вестник восхода Сириуса.' },
            { id: 'aludra', name: 'Алудра', bayer: 'η CMa', ra: 111.02, dec: -29.30, mag: 2.45, distLy: 2000, distPc: 613.2, spectral: 'B5Ia', tempK: 15000, lum: 100000, radius: 56, color: '#93c5fd', desc: 'Голубой сверхгигант в хвосте Большого Пса.' }
        ],
        lines: [
            ['mirzam', 'sirius'],
            ['sirius', 'wezen'],
            ['wezen', 'adhara'],
            ['wezen', 'aludra']
        ]
    },
    {
        id: 'taurus',
        nameRu: 'Телец',
        nameLat: 'Taurus',
        genitive: 'Tauri',
        code: 'Tau',
        starsCount: 4,
        season: 'Зодиакальное созвездие • Осень-зима',
        myth: 'Древнее зодиакальное созвездие с оранжевым гигантом Альдебаран («Глаз Тельца») и знаменитыми скоплениями Плеяды и Гиады.',
        stars: [
            { id: 'aldebaran', name: 'Альдебаран', bayer: 'α Tau', ra: 68.98, dec: 16.51, mag: 0.85, distLy: 65.3, distPc: 20.0, spectral: 'K5III', tempK: 3900, lum: 439, radius: 44, color: '#fdba74', desc: 'Оранжевый гигант, 14-я по яркости звезда неба. Проецируется на рассеянное скопление Гиады.' },
            { id: 'elnath', name: 'Нат', bayer: 'β Tau', ra: 81.57, dec: 28.61, mag: 1.65, distLy: 134, distPc: 41.1, spectral: 'B7III', tempK: 13820, lum: 700, radius: 4.2, color: '#93c5fd', desc: 'Бело-голубой гигант северного рога Тельца.' },
            { id: 'alcyone', name: 'Альциона (Плеяды)', bayer: 'η Tau', ra: 56.87, dec: 24.11, mag: 2.87, distLy: 440, distPc: 134.9, spectral: 'B7IIIe', tempK: 12300, lum: 2400, radius: 10, color: '#93c5fd', desc: 'Ярчайшая звезда легендарного звёздного скопления Плеяды (Семь Сестёр).' },
            { id: 'tippel', name: 'Тьен-Кван', bayer: 'ζ Tau', ra: 84.41, dec: 21.14, mag: 3.01, distLy: 440, distPc: 134.9, spectral: 'B2IIIe', tempK: 19000, lum: 4100, radius: 6.0, color: '#67e8f9', desc: 'Звезда южного рога Тельца, рядом с Крабовидной туманностью (M1).' }
        ],
        lines: [
            ['aldebaran', 'elnath'],
            ['aldebaran', 'tippel'],
            ['aldebaran', 'alcyone']
        ]
    },
    {
        id: 'leo',
        nameRu: 'Лев',
        nameLat: 'Leo',
        genitive: 'Leonis',
        code: 'Leo',
        starsCount: 4,
        season: 'Зодиакальное созвездие • Весна',
        myth: 'Царственное зодиакальное созвездие весны с великолепным субгигантом Регул («Сердце Льва»).',
        stars: [
            { id: 'regulus', name: 'Регул', bayer: 'α Leo', ra: 152.09, dec: 11.97, mag: 1.36, distLy: 79.3, distPc: 24.3, spectral: 'B8IVn', tempK: 12460, lum: 316, radius: 3.1, color: '#93c5fd', desc: '«Маленький царь», быстровращающийся сплюснутый субгигант в основании серпа Льва.' },
            { id: 'algieba', name: 'Альгиеба', bayer: 'γ Leo', ra: 154.99, dec: 19.84, mag: 2.01, distLy: 130, distPc: 39.9, spectral: 'K0III', tempK: 4470, lum: 320, radius: 32, color: '#fdba74', desc: 'Великолепная двойная система двух оранжево-золотых гигантов в гриве Льва.' },
            { id: 'denebola', name: 'Денебола', bayer: 'β Leo', ra: 177.26, dec: 14.57, mag: 2.14, distLy: 35.9, distPc: 11.0, spectral: 'A3V', tempK: 8500, lum: 15, radius: 1.73, color: '#f8fafc', desc: 'Белая звезда в хвосте Льва, окруженная околозвездным диском пыли.' },
            { id: 'zosma', name: 'Зосма', bayer: 'δ Leo', ra: 168.53, dec: 20.52, mag: 2.56, distLy: 58.4, distPc: 17.9, spectral: 'A4V', tempK: 8290, lum: 23, radius: 2.2, color: '#f8fafc', desc: 'Белая звезда спины Льва, входит в движущуюся группу Большой Медведицы.' }
        ],
        lines: [
            ['regulus', 'algieba'],
            ['algieba', 'zosma'],
            ['zosma', 'denebola']
        ]
    },
    {
        id: 'scorpius',
        nameRu: 'Скорпион',
        nameLat: 'Scorpius',
        genitive: 'Scorpii',
        code: 'Sco',
        starsCount: 5,
        season: 'Зодиакальное созвездие • Лето',
        myth: 'Ярчайшее созвездие центра Галактики с красным сверхгигантом Антарес («Соперник Марса»).',
        stars: [
            { id: 'antares', name: 'Антарес', bayer: 'α Sco', ra: 247.35, dec: -26.43, mag: 0.96, distLy: 550, distPc: 168.6, spectral: 'M1.5Iab', tempK: 3400, lum: 75900, radius: 680, color: '#f87171', desc: 'Рубиново-красный сверхгигант колоссальных размеров, сердце Скорпиона.' },
            { id: 'shaula', name: 'Шаула', bayer: 'λ Sco', ra: 263.40, dec: -37.10, mag: 1.62, distLy: 570, distPc: 174.8, spectral: 'B2IV', tempK: 25000, lum: 36300, radius: 8.8, color: '#67e8f9', desc: 'Тройная звездная система на самом кончике хвоста («Жало Скорпиона»).' },
            { id: 'sargas', name: 'Саргас', bayer: 'θ Sco', ra: 264.33, dec: -42.99, mag: 1.86, distLy: 300, distPc: 92.0, spectral: 'F0II', tempK: 7260, lum: 1830, radius: 26, color: '#f8fafc', desc: 'Яркий белый гигант в изгибе хвоста Скорпиона.' },
            { id: 'dschubba', name: 'Дшуба', bayer: 'δ Sco', ra: 240.08, dec: -22.62, mag: 2.29, distLy: 490, distPc: 150.2, spectral: 'B0.3IV', tempK: 27400, lum: 14000, radius: 6.7, color: '#67e8f9', desc: 'Центральная звезда клешни Скорпиона, быстровращающаяся переменная Be-звезда.' },
            { id: 'acrab', name: 'Акраб', bayer: 'β Sco', ra: 241.36, dec: -19.80, mag: 2.56, distLy: 404, distPc: 123.9, spectral: 'B1V', tempK: 28000, lum: 15000, radius: 6.3, color: '#67e8f9', desc: 'Кратная система из пяти горячих звезд в северной клешне.' }
        ],
        lines: [
            ['acrab', 'dschubba'],
            ['dschubba', 'antares'],
            ['antares', 'sargas'],
            ['sargas', 'shaula']
        ]
    },
    {
        id: 'pegasus',
        nameRu: 'Пегас',
        nameLat: 'Pegasus',
        genitive: 'Pegasi',
        code: 'Peg',
        starsCount: 4,
        season: 'Северное полушарие • Осеннее',
        myth: 'Крылатый конь античной мифологии. Знаменитый Большой Квадрат Пегаса открывает осеннее звездное небо.',
        stars: [
            { id: 'markab', name: 'Маркаб', bayer: 'α Peg', ra: 346.19, dec: 15.21, mag: 2.49, distLy: 133, distPc: 40.8, spectral: 'B9.5III', tempK: 9765, lum: 160, radius: 4.6, color: '#93c5fd', desc: 'Бело-голубой гигант, юго-западный угол Большого Квадрата Пегаса.' },
            { id: 'scheat', name: 'Шеат', bayer: 'β Peg', ra: 345.94, dec: 28.08, mag: 2.44, distLy: 196, distPc: 60.1, spectral: 'M2.5II-III', tempK: 3689, lum: 1500, radius: 95, color: '#f87171', desc: 'Красный пульсирующий гигант, северо-западный угол Квадрата Пегаса.' },
            { id: 'algenib', name: 'Альгениб', bayer: 'γ Peg', ra: 2.15, dec: 15.18, mag: 2.84, distLy: 390, distPc: 119.6, spectral: 'B2IV', tempK: 21180, lum: 5800, radius: 4.8, color: '#67e8f9', desc: 'Голубой пульсирующий субгигант типа Бета Цефея, юго-восточный угол.' },
            { id: 'alpheratz', name: 'Альферац', bayer: 'α And', ra: 2.10, dec: 29.09, mag: 2.07, distLy: 97, distPc: 29.7, spectral: 'B8IV', tempK: 13800, lum: 240, radius: 2.7, color: '#93c5fd', desc: 'Северо-восточный угол Большого Квадрата Пегаса, ртутно-марганцевая пекулярная звезда.' }
        ],
        lines: [
            ['markab', 'scheat'],
            ['scheat', 'alpheratz'],
            ['alpheratz', 'algenib'],
            ['algenib', 'markab']
        ]
    }
];

/**
 * Класс управления созвездиями и интерактивными звездами
 */
export class ConstellationsEngine {
    constructor() {
        this.constellations = [];
        this.spaceEngine = null;
        this.canvas = null;
        this.ctx = null;
        this.viewport = null;

        this.mousePos = { x: -9999, y: -9999 };
        this.hoveredConstellation = null;
        this.hoveredStar = null;
        this.selectedConstellation = null;
        this.selectedStar = null;

        this.hudCardEl = null;
        this.audioCtx = null;
        this.animTime = 0;

        // Каскадное появление созвездий при открытии сцены (fade-in со stagger)
        this.revealClock = 0;
        this.revealStarted = false;
        this.prefersReducedMotion = (typeof window.matchMedia === 'function')
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false;

        this.onPointerMove = this.onPointerMove.bind(this);
        this.onClick = this.onClick.bind(this);
    }

    /**
     * Инициализация подсистемы созвездий
     */
    init(spaceEngine) {
        this.spaceEngine = spaceEngine;
        this.canvas = spaceEngine ? spaceEngine.canvas : document.getElementById('space-3d-canvas');
        this.ctx = spaceEngine ? spaceEngine.ctx : (this.canvas ? this.canvas.getContext('2d') : null);
        this.viewport = spaceEngine ? spaceEngine.viewport : document.getElementById('space-3d-viewport');

        this.buildConstellationCoords();
        this.injectStyles();
        this.buildHudCard();
        this.setupEventListeners();
        this.startReveal();

        console.log(`[Constellations] Initialized ${this.constellations.length} astronomical constellations.`);
    }

    /**
     * Пересчет сферических координат звезд в 3D векторы небесного купола
     */
    buildConstellationCoords() {
        this.constellations = CONSTELLATIONS_CATALOG.map((c, cIndex) => {
            const starMap = new Map();
            let sumX = 0, sumY = 0, sumZ = 0;

            const stars = c.stars.map(s => {
                const raRad = s.ra * DEG_TO_RAD;
                const decRad = s.dec * DEG_TO_RAD;

                // 3D точка на небесной сфере:
                // X = R * cos(dec) * sin(ra)
                // Y = R * sin(dec)
                // Z = R * cos(dec) * cos(ra)
                const cosDec = Math.cos(decRad);
                const x = SKY_SPHERE_RADIUS * cosDec * Math.sin(raRad);
                const y = SKY_SPHERE_RADIUS * Math.sin(decRad);
                const z = SKY_SPHERE_RADIUS * cosDec * Math.cos(raRad);

                sumX += x;
                sumY += y;
                sumZ += z;

                const starObj = {
                    ...s,
                    constellationId: c.id,
                    worldPos: { x, y, z },
                    screenX: -9999,
                    screenY: -9999,
                    isVisible: false
                };
                starMap.set(s.id, starObj);
                return starObj;
            });

            // Центроид созвездия для метки
            const starLen = stars.length || 1;
            const cLen = Math.hypot(sumX, sumY, sumZ) || 1;
            const centroid = {
                x: (sumX / cLen) * SKY_SPHERE_RADIUS,
                y: (sumY / cLen) * SKY_SPHERE_RADIUS,
                z: (sumZ / cLen) * SKY_SPHERE_RADIUS,
                screenX: -9999,
                screenY: -9999,
                isVisible: false
            };

            return {
                ...c,
                stars,
                starMap,
                centroid,
                pulsePhase: Math.random() * Math.PI * 2,
                // Каскадный stagger появления линий созвездия
                revealDelay: 0.35 + cIndex * 0.14
            };
        });
    }

    setupEventListeners() {
        const vp = this.viewport || window;
        vp.addEventListener('pointermove', this.onPointerMove, { passive: true });
        vp.addEventListener('click', this.onClick);
    }

    onPointerMove(e) {
        this.mousePos.x = e.clientX;
        this.mousePos.y = e.clientY;

        let bestStar = null;
        let bestConstellation = null;
        let bestDist = 32; // Радиус захвата мыши для звезды (px)

        for (let c = 0; c < this.constellations.length; c++) {
            const constel = this.constellations[c];
            for (let s = 0; s < constel.stars.length; s++) {
                const star = constel.stars[s];
                if (!star.isVisible) continue;

                const dx = this.mousePos.x - star.screenX;
                const dy = this.mousePos.y - star.screenY;
                const dist = Math.hypot(dx, dy);

                if (dist < bestDist) {
                    bestDist = dist;
                    bestStar = star;
                    bestConstellation = constel;
                }
            }
        }

        const prevStar = this.hoveredStar;
        this.hoveredStar = bestStar;
        this.hoveredConstellation = bestConstellation;

        if (bestStar !== prevStar) {
            if (this.viewport && !document.querySelector('.sat-telemetry-hud.active')) {
                this.viewport.style.cursor = bestStar ? 'pointer' : '';
            }
            if (bestStar) {
                this.playStellarChime(false);
            }
        }
    }

    onClick(e) {
        if (e.target.closest('.constellation-telemetry-hud') || e.target.closest('.sat-telemetry-hud') || e.target.closest('.iss-telemetry-hud') || e.target.closest('.space-station-card') || e.target.closest('.space-3d-hud-dock') || e.target.closest('.space-3d-hud-top')) {
            return;
        }

        if (this.hoveredStar && this.hoveredConstellation) {
            this.selectConstellationAndStar(this.hoveredConstellation, this.hoveredStar);
        }
    }

    selectConstellationAndStar(constel, star) {
        this.selectedConstellation = constel;
        this.selectedStar = star;

        this.updateHudCard(constel, star);
        if (this.hudCardEl) {
            this.hudCardEl.classList.add('active');
        }
        this.playStellarChime(true);
        SpaceAudio.playVoice('focus');
    }

    closeHud() {
        this.selectedConstellation = null;
        this.selectedStar = null;
        if (this.hudCardEl) {
            this.hudCardEl.classList.remove('active');
        }
    }

    focusCameraOnConstellation(constel, star) {
        if (!this.spaceEngine) return;
        const target = star || (constel ? constel.centroid : null);
        if (!target) return;

        const dist = Math.hypot(target.worldPos.x, target.worldPos.y, target.worldPos.z) || 1;
        const yawDeg = Math.atan2(target.worldPos.x, target.worldPos.z) * RAD_TO_DEG;
        const pitchDeg = Math.asin(target.worldPos.y / dist) * RAD_TO_DEG;

        let targetYaw = yawDeg % 360;
        if (targetYaw > 180) targetYaw -= 360;
        if (targetYaw < -180) targetYaw += 360;

        this.spaceEngine.targetYaw = targetYaw;
        this.spaceEngine.targetPitch = Math.max(-65, Math.min(65, pitchDeg));
        this.spaceEngine.targetZoom = 1.30;
        this.playStellarChime(true);
        SpaceAudio.playVoice('focus');
    }

    playStellarChime(isMajor = false) {
        try {
            if (!this.audioCtx) {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (AudioCtxClass) this.audioCtx = new AudioCtxClass();
            }
            if (!this.audioCtx) return;
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sine';
            const baseFreq = isMajor ? 1760 : 2200; // A6 note celestial tone
            const now = this.audioCtx.currentTime;

            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.12);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(isMajor ? 0.06 : 0.02, now + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + (isMajor ? 0.35 : 0.12));

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(now);
            osc.stop(now + (isMajor ? 0.35 : 0.12));
        } catch (e) {}
    }

    injectStyles() {
        if (document.getElementById('constellations-styles')) return;

        const style = document.createElement('style');
        style.id = 'constellations-styles';
        style.textContent = `
            .constellation-telemetry-hud {
                position: absolute;
                top: 84px;
                right: 32px;
                width: 390px;
                background: linear-gradient(135deg, rgba(6, 12, 28, 0.95) 0%, rgba(15, 23, 42, 0.97) 100%);
                border: 1px solid rgba(125, 211, 252, 0.40);
                box-shadow: 0 0 35px rgba(56, 189, 248, 0.20), inset 0 0 20px rgba(14, 165, 233, 0.08);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                border-radius: 14px;
                color: #f1f5f9;
                font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
                padding: 18px 20px;
                z-index: 10000;
                transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
                opacity: 0;
                transform: translateY(-16px) scale(0.96);
                pointer-events: none;
                user-select: none;
            }

            .constellation-telemetry-hud.active {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: auto;
            }

            .constel-hud-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid rgba(125, 211, 252, 0.25);
                padding-bottom: 12px;
                margin-bottom: 12px;
            }

            .constel-hud-brand {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .constel-hud-icon {
                width: 28px;
                height: 28px;
                border-radius: 6px;
                background: rgba(56, 189, 248, 0.15);
                border: 1px solid rgba(56, 189, 248, 0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #38bdf8;
            }

            .constel-hud-title {
                font-size: 14px;
                font-weight: 700;
                color: #ffffff;
                letter-spacing: 0.5px;
            }

            .constel-hud-sub {
                font-size: 10px;
                color: #94a3b8;
                letter-spacing: 0.8px;
                text-transform: uppercase;
                margin-top: 1px;
            }

            .constel-hud-close-btn {
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.12);
                color: #cbd5e1;
                width: 28px;
                height: 28px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .constel-hud-close-btn:hover {
                background: rgba(239, 68, 68, 0.2);
                border-color: #ef4444;
                color: #ffffff;
            }

            .constel-star-highlight {
                background: rgba(14, 165, 233, 0.12);
                border: 1px solid rgba(56, 189, 248, 0.3);
                border-radius: 8px;
                padding: 10px 12px;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .constel-star-name {
                font-size: 13.5px;
                font-weight: 700;
                color: #ffffff;
            }

            .constel-star-bayer {
                font-size: 10.5px;
                color: #7dd3fc;
                margin-top: 2px;
            }

            .constel-spectral-badge {
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 10px;
                font-weight: 700;
                background: rgba(2, 6, 23, 0.7);
                border: 1px solid rgba(255, 255, 255, 0.2);
                letter-spacing: 0.5px;
            }

            .constel-hud-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 12px;
            }

            .constel-tele-tile {
                background: rgba(15, 23, 42, 0.65);
                border: 1px solid rgba(56, 189, 248, 0.15);
                border-radius: 8px;
                padding: 8px 10px;
            }

            .constel-tile-label {
                font-size: 9.5px;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                margin-bottom: 2px;
            }

            .constel-tile-val {
                font-size: 12.5px;
                font-weight: 700;
                color: #e2e8f0;
            }

            .constel-tile-val.accent {
                color: #38bdf8;
            }

            .constel-tile-val.gold {
                color: #f59e0b;
            }

            .constel-temp-bar-wrap {
                background: rgba(15, 23, 42, 0.65);
                border: 1px solid rgba(56, 189, 248, 0.15);
                border-radius: 8px;
                padding: 8px 10px;
                margin-bottom: 12px;
            }

            .constel-temp-bar-label {
                display: flex;
                justify-content: space-between;
                font-size: 9.5px;
                color: #94a3b8;
                margin-bottom: 4px;
            }

            .constel-temp-gradient-track {
                height: 6px;
                border-radius: 3px;
                background: linear-gradient(to right, #f87171, #fdba74, #fef08a, #ffffff, #93c5fd, #67e8f9);
                position: relative;
            }

            .constel-temp-pin {
                position: absolute;
                top: -3px;
                width: 4px;
                height: 12px;
                background: #ffffff;
                border: 1px solid #000000;
                border-radius: 2px;
                transform: translateX(-50%);
                box-shadow: 0 0 6px #ffffff;
            }

            .constel-hud-desc {
                background: rgba(2, 6, 23, 0.55);
                border-left: 3px solid #38bdf8;
                padding: 8px 12px;
                font-size: 11px;
                line-height: 1.45;
                color: #cbd5e1;
                margin-bottom: 14px;
                border-radius: 0 6px 6px 0;
            }

            .constel-hud-btn {
                width: 100%;
                background: rgba(56, 189, 248, 0.12);
                border: 1px solid rgba(56, 189, 248, 0.35);
                color: #38bdf8;
                font-family: inherit;
                font-size: 11px;
                font-weight: 600;
                padding: 9px 12px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all 0.2s;
            }

            .constel-hud-btn:hover {
                background: rgba(56, 189, 248, 0.26);
                border-color: #38bdf8;
                color: #ffffff;
                box-shadow: 0 0 14px rgba(56, 189, 248, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    buildHudCard() {
        if (document.getElementById('constellation-telemetry-hud')) {
            this.hudCardEl = document.getElementById('constellation-telemetry-hud');
            return;
        }

        const card = document.createElement('div');
        card.id = 'constellation-telemetry-hud';
        card.className = 'constellation-telemetry-hud';
        card.innerHTML = `
            <div class="constel-hud-header">
                <div class="constel-hud-brand">
                    <div class="constel-hud-icon">
                        <span class="material-symbols-outlined" style="font-size:18px;">auto_awesome</span>
                    </div>
                    <div>
                        <div class="constel-hud-title" id="constel-hud-name">Орион // Orion</div>
                        <div class="constel-hud-sub" id="constel-hud-sub">ORI • ЭКВАТОРИАЛЬНОЕ СОЗВЕЗДИЕ</div>
                    </div>
                </div>
                <button type="button" class="constel-hud-close-btn" id="constel-hud-close-btn" title="Закрыть HUD">
                    <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                </button>
            </div>

            <div class="constel-star-highlight">
                <div>
                    <div class="constel-star-name" id="constel-star-name">Бетельгейзе</div>
                    <div class="constel-star-bayer" id="constel-star-bayer">α Ori (Альфа Ориона)</div>
                </div>
                <div class="constel-spectral-badge" id="constel-spectral-badge" style="color:#f87171;">
                    M1-2Ia • Красный сверхгигант
                </div>
            </div>

            <div class="constel-hud-grid">
                <div class="constel-tele-tile">
                    <div class="constel-tile-label">Расстояние от Земли</div>
                    <div class="constel-tile-val accent" id="constel-tele-dist">548 св. лет (168 пк)</div>
                </div>
                <div class="constel-tele-tile">
                    <div class="constel-tile-label">Светимость звезды</div>
                    <div class="constel-tile-val gold" id="constel-tele-lum">126 000 L☉</div>
                </div>
                <div class="constel-tele-tile">
                    <div class="constel-tile-label">Температура поверхности</div>
                    <div class="constel-tile-val" id="constel-tele-temp">3 600 K</div>
                </div>
                <div class="constel-tele-tile">
                    <div class="constel-tile-label">Видимая величина (Mag)</div>
                    <div class="constel-tile-val accent" id="constel-tele-mag">+0.50m</div>
                </div>
            </div>

            <div class="constel-temp-bar-wrap">
                <div class="constel-temp-bar-label">
                    <span>Спектр: M (3000 K)</span>
                    <span id="constel-temp-bar-cur">3 600 K</span>
                    <span>O (30 000 K)</span>
                </div>
                <div class="constel-temp-gradient-track">
                    <div class="constel-temp-pin" id="constel-temp-pin" style="left: 10%;"></div>
                </div>
            </div>

            <div class="constel-hud-desc" id="constel-hud-desc">
                Красный пульсирующий сверхгигант колоссальных размеров.
            </div>

            <button type="button" class="constel-hud-btn" id="constel-hud-focus-btn">
                <span class="material-symbols-outlined" style="font-size:16px;">center_focus_strong</span>
                Центрировать камеру на созвездии
            </button>
        `;
        const targetParent = this.viewport || document.body;
        targetParent.appendChild(card);
        this.hudCardEl = card;

        const closeBtn = document.getElementById('constel-hud-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeHud());

        const focusBtn = document.getElementById('constel-hud-focus-btn');
        if (focusBtn) {
            focusBtn.addEventListener('click', () => {
                if (this.selectedConstellation) {
                    this.focusCameraOnConstellation(this.selectedConstellation, this.selectedStar);
                }
            });
        }
    }

    updateHudCard(constel, star) {
        if (!constel || !star) return;

        const nameEl = document.getElementById('constel-hud-name');
        const subEl = document.getElementById('constel-hud-sub');
        const starNameEl = document.getElementById('constel-star-name');
        const bayerEl = document.getElementById('constel-star-bayer');
        const badgeEl = document.getElementById('constel-spectral-badge');
        const distEl = document.getElementById('constel-tele-dist');
        const lumEl = document.getElementById('constel-tele-lum');
        const tempEl = document.getElementById('constel-tele-temp');
        const magEl = document.getElementById('constel-tele-mag');
        const tempPinEl = document.getElementById('constel-temp-pin');
        const tempBarCurEl = document.getElementById('constel-temp-bar-cur');
        const descEl = document.getElementById('constel-hud-desc');

        if (nameEl) nameEl.textContent = `${constel.nameRu} // ${constel.nameLat}`;
        if (subEl) subEl.textContent = `${constel.code} • ${constel.season.toUpperCase()}`;
        if (starNameEl) starNameEl.textContent = star.name;
        if (bayerEl) bayerEl.textContent = `${star.bayer} (${star.nameRu || star.name})`;

        if (badgeEl) {
            badgeEl.textContent = `${star.spectral} • ${this.getSpectralClassName(star.spectral)}`;
            badgeEl.style.color = star.color;
            badgeEl.style.borderColor = star.color;
        }

        if (distEl) distEl.textContent = `${star.distLy} св. лет (${star.distPc} пк)`;
        if (lumEl) lumEl.textContent = `${star.lum.toLocaleString()} L☉`;
        if (tempEl) tempEl.textContent = `${star.tempK.toLocaleString()} K`;
        if (magEl) magEl.textContent = `${star.mag >= 0 ? '+' : ''}${star.mag.toFixed(2)}m`;

        // Расчет позиции индикатора температуры на градиентной шкале (3000 K..30000 K)
        const tClamped = Math.max(3000, Math.min(30000, star.tempK));
        const tPercent = ((tClamped - 3000) / (30000 - 3000)) * 100;
        if (tempPinEl) tempPinEl.style.left = `${tPercent.toFixed(1)}%`;
        if (tempBarCurEl) tempBarCurEl.textContent = `${star.tempK} K`;

        if (descEl) {
            descEl.textContent = `${star.desc} ${constel.myth}`;
        }
    }

    getSpectralClassName(sp) {
        if (!sp) return 'Звезда';
        const c = sp.charAt(0).toUpperCase();
        switch (c) {
            case 'O': return 'Голубой сверхгигант';
            case 'B': return 'Бело-голубой гигант';
            case 'A': return 'Белая звезда';
            case 'F': return 'Желто-белая звезда';
            case 'G': return 'Желтый карлик';
            case 'K': return 'Оранжевый гигант';
            case 'M': return 'Красный сверхгигант';
            default: return 'Звезда';
        }
    }

    /**
     * Запуск каскадного fade-in созвездий (при инициализации / открытии сцены)
     */
    startReveal() {
        this.revealClock = 0;
        this.revealStarted = true;
    }

    /**
     * Коэффициент появления созвездия (0..1) с каскадным stagger.
     * При prefers-reduced-motion анимаций нет — созвездия видны сразу.
     */
    getReveal(constel) {
        if (this.prefersReducedMotion) return 1;
        const t = Math.max(0, this.revealClock - (constel.revealDelay || 0));
        const dur = 1.1;
        // ease-out по кривой, родственной --space-ease cubic-bezier(0.16,1,0.3,1)
        const x = Math.min(1, t / dur);
        return 1 - Math.pow(1 - x, 3);
    }

    /**
     * Отрисовка линий созвездий, звезд и интерактивных прицелов
     */
    render(ctx, w, h, yaw, pitch, zoom) {
        if (!ctx) return;

        this.animTime += 0.016;
        if (this.revealStarted && !this.prefersReducedMotion) this.revealClock += 0.016;

        const eng = this.spaceEngine;

        // ФИКС БАГА «созвездия двигаются за мышкой»: параллакс мыши (±3°),
        // который применяет space3d к GL-небу и 3D-миру (effYaw/effPitch),
        // должен учитываться и здесь — иначе фигуры созвездий плывут
        // относительно неподвижных звёзд при движении курсора.
        // При CPU-фолбэке (GL выключен) звёзды рисуются на этом же canvas
        // по «сырому» yaw/pitch — параллакс не добавляем.
        let parallaxYaw = 0;
        let parallaxPitch = 0;
        if (eng && eng.glEnabled && !(eng.isDraggingWorld || eng.camTween)) {
            parallaxYaw = eng.parallaxYaw || 0;
            parallaxPitch = eng.parallaxPitch || 0;
        }
        const effYaw = yaw + parallaxYaw;
        const effPitch = pitch + parallaxPitch;

        const radYaw = (effYaw * Math.PI) / 180;
        const radPitch = (effPitch * Math.PI) / 180;
        const cosYaw = Math.cos(radYaw);
        const sinYaw = Math.sin(radYaw);
        const cosPitch = Math.cos(radPitch);
        const sinPitch = Math.sin(radPitch);

        const fov = 750 * zoom;
        const cx = w / 2;
        const cy = h / 2;

        // 1. Проецируем все звезды созвездий в экранное пространство
        for (let c = 0; c < this.constellations.length; c++) {
            const constel = this.constellations[c];

            for (let s = 0; s < constel.stars.length; s++) {
                const star = constel.stars[s];
                const x1 = star.worldPos.x * cosYaw - star.worldPos.z * sinYaw;
                const z1 = star.worldPos.x * sinYaw + star.worldPos.z * cosYaw;
                const y2 = star.worldPos.y * cosPitch - z1 * sinPitch;
                const z2 = star.worldPos.y * sinPitch + z1 * cosPitch;

                if (z2 > 0.08) {
                    star.screenX = cx + (x1 / z2) * fov;
                    star.screenY = cy - (y2 / z2) * fov;
                    star.isVisible = (star.screenX >= -100 && star.screenX <= w + 100 && star.screenY >= -100 && star.screenY <= h + 100);
                } else {
                    star.isVisible = false;
                }
            }

            // Центроид созвездия
            const x1c = constel.centroid.x * cosYaw - constel.centroid.z * sinYaw;
            const z1c = constel.centroid.x * sinYaw + constel.centroid.z * cosYaw;
            const y2c = constel.centroid.y * cosPitch - z1c * sinPitch;
            const z2c = constel.centroid.y * sinPitch + z1c * cosPitch;
            if (z2c > 0.08) {
                constel.centroid.screenX = cx + (x1c / z2c) * fov;
                constel.centroid.screenY = cy - (y2c / z2c) * fov;
                constel.centroid.isVisible = true;
            } else {
                constel.centroid.isVisible = false;
            }
        }

        // 2. Отрисовка линий астеризмов
        ctx.save();
        ctx.lineCap = 'round';
        for (let c = 0; c < this.constellations.length; c++) {
            const constel = this.constellations[c];
            const isHovered = (this.hoveredConstellation === constel);
            const isSelected = (this.selectedConstellation === constel);
            const reveal = this.getReveal(constel);
            if (reveal <= 0.01) continue;

            const emphasize = isHovered || isSelected;

            // Базовая тонкая линия; свечение (shadowBlur) — только при hover/выборе
            const lineWidth = isSelected ? 1.6 : (isHovered ? 1.3 : 0.75);
            const edgeAlpha = (isSelected ? 0.85 : (isHovered ? 0.7 : 0.5)) * reveal;
            const midAlpha = (isSelected ? 0.38 : (isHovered ? 0.3 : 0.14)) * reveal;

            ctx.lineWidth = lineWidth;
            if (emphasize) {
                ctx.shadowColor = isSelected ? 'rgba(56, 189, 248, 0.85)' : 'rgba(236, 72, 153, 0.6)';
                ctx.shadowBlur = 7;
            } else {
                ctx.shadowBlur = 0;
            }

            for (let l = 0; l < constel.lines.length; l++) {
                const [sId1, sId2] = constel.lines[l];
                const s1 = constel.starMap.get(sId1);
                const s2 = constel.starMap.get(sId2);

                if (s1 && s2 && s1.isVisible && s2.isVisible) {
                    // Градиент alpha по длине сегмента: ярче у звёзд-узлов,
                    // тает в середине. Холодный голубой/бирюзовый в тон палитры.
                    const grad = ctx.createLinearGradient(s1.screenX, s1.screenY, s2.screenX, s2.screenY);
                    grad.addColorStop(0, `rgba(125, 211, 252, ${edgeAlpha.toFixed(3)})`);
                    grad.addColorStop(0.5, `rgba(236, 72, 153, ${midAlpha.toFixed(3)})`);
                    grad.addColorStop(1, `rgba(56, 189, 248, ${edgeAlpha.toFixed(3)})`);
                    ctx.strokeStyle = grad;
                    ctx.globalAlpha = 1;

                    ctx.beginPath();
                    ctx.moveTo(s1.screenX, s1.screenY);
                    ctx.lineTo(s2.screenX, s2.screenY);
                    ctx.stroke();

                    // Энергетический импульс вдоль линии при наведении/выборе
                    if (emphasize) {
                        const pulse = (this.animTime * 1.5 + l * 0.4) % 1.0;
                        const pulseX = s1.screenX + (s2.screenX - s1.screenX) * pulse;
                        const pulseY = s1.screenY + (s2.screenY - s1.screenY) * pulse;

                        ctx.fillStyle = '#ffffff';
                        ctx.shadowBlur = 0;
                        ctx.beginPath();
                        ctx.arc(pulseX, pulseY, 1.6, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 7;
                    }
                }
            }

            ctx.shadowBlur = 0;

            // Название созвездия у центроида: тонкая типографика с fade-in
            if (constel.centroid.isVisible) {
                const nameAlpha = reveal * (isSelected ? 0.95 : (isHovered ? 0.8 : 0.34));
                if (nameAlpha > 0.02) {
                    ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
                    // Плавная разрядка (letter-spacing), где поддерживается
                    if ('letterSpacing' in ctx) ctx.letterSpacing = '2.5px';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = isSelected ? 'rgba(125, 211, 252, 1)' : 'rgba(224, 242, 254, 1)';
                    ctx.globalAlpha = nameAlpha;
                    if (emphasize) {
                        ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
                        ctx.shadowBlur = 6;
                    }
                    ctx.fillText(`${constel.nameLat.toUpperCase()} · ${constel.code}`, constel.centroid.screenX, constel.centroid.screenY - 16);
                    ctx.shadowBlur = 0;
                    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
                    ctx.globalAlpha = 1;
                }
            }
        }
        ctx.restore();

        // 3. Отрисовка звезд созвездий
        for (let c = 0; c < this.constellations.length; c++) {
            const constel = this.constellations[c];
            const constelHovered = (this.hoveredConstellation === constel);
            const constelSelected = (this.selectedConstellation === constel);
            const reveal = this.getReveal(constel);
            if (reveal <= 0.01) continue;

            for (let s = 0; s < constel.stars.length; s++) {
                const star = constel.stars[s];
                if (!star.isVisible) continue;

                const isHovered = (this.hoveredStar === star);
                const isSelected = (this.selectedStar === star);
                const emphasized = isHovered || isSelected;
                // Подсветка всех узлов при hover/выборе созвездия
                const nodeGlow = (constelHovered || constelSelected) && !emphasized;

                // Базовый размер от видимой величины (чуть крупнее фоновых звёзд)
                const baseRadius = Math.max(1.9, (4.5 - star.mag) * 1.05);
                const drawRadius = emphasized ? baseRadius * 1.5 : (nodeGlow ? baseRadius * 1.2 : baseRadius);
                const starAlpha = reveal * (emphasized ? 1 : (nodeGlow ? 0.95 : 0.85));

                // Ореол свечения
                const haloR = drawRadius * (emphasized ? 4.2 : 3.2);
                const haloGrad = ctx.createRadialGradient(star.screenX, star.screenY, 0, star.screenX, star.screenY, haloR);
                haloGrad.addColorStop(0, star.color);
                haloGrad.addColorStop(0.3, star.color + '66');
                haloGrad.addColorStop(1, 'rgba(0,0,0,0)');

                ctx.globalAlpha = starAlpha;
                ctx.fillStyle = haloGrad;
                ctx.beginPath();
                ctx.arc(star.screenX, star.screenY, haloR, 0, Math.PI * 2);
                ctx.fill();

                // Ядро звезды
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(star.screenX, star.screenY, drawRadius, 0, Math.PI * 2);
                ctx.fill();

                // Дифракционный 4-лучевой крест у ярких звезд (как hero-звёзды сцены)
                if (star.mag <= 2.2 || emphasized || nodeGlow) {
                    const spikeLen = drawRadius * (emphasized ? 4.4 : (nodeGlow ? 3.4 : 3.0));
                    ctx.strokeStyle = star.color;
                    ctx.lineWidth = emphasized ? 0.9 : 0.55;
                    ctx.globalAlpha = starAlpha * 0.85;
                    ctx.beginPath();
                    ctx.moveTo(star.screenX - spikeLen, star.screenY);
                    ctx.lineTo(star.screenX + spikeLen, star.screenY);
                    ctx.moveTo(star.screenX, star.screenY - spikeLen);
                    ctx.lineTo(star.screenX, star.screenY + spikeLen);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1.0;
            }
        }

        // 4. Прицельная рамка на наведенной звезде
        if (this.hoveredStar && this.hoveredStar.isVisible) {
            this.drawStarHoverReticle(ctx, this.hoveredStar);
        }
    }

    drawStarHoverReticle(ctx, star) {
        const px = star.screenX;
        const py = star.screenY;
        const r = 18;

        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;

        const len = 6;
        // Верхний левый
        ctx.beginPath();
        ctx.moveTo(px - r, py - r + len);
        ctx.lineTo(px - r, py - r);
        ctx.lineTo(px - r + len, py - r);
        ctx.stroke();

        // Верхний правый
        ctx.beginPath();
        ctx.moveTo(px + r - len, py - r);
        ctx.lineTo(px + r, py - r);
        ctx.lineTo(px + r, py - r + len);
        ctx.stroke();

        // Нижний левый
        ctx.beginPath();
        ctx.moveTo(px - r, py + r - len);
        ctx.lineTo(px - r, py + r);
        ctx.lineTo(px - r + len, py + r);
        ctx.stroke();

        // Нижний правый
        ctx.beginPath();
        ctx.moveTo(px + r - len, py + r);
        ctx.lineTo(px + r, py + r);
        ctx.lineTo(px + r, py + r - len);
        ctx.stroke();

        // Текстовая подсказка
        ctx.font = '600 10.5px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(`${star.name} (${star.bayer})`, px + r + 6, py - 4);

        ctx.font = '500 9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.shadowBlur = 0;
        ctx.fillText(`${star.spectral} • ${star.distLy} св. лет • ${star.tempK} K`, px + r + 6, py + 8);

        ctx.restore();
    }

    hideOverlays() {
        this.closeHud();
        this.hoveredStar = null;
        this.hoveredConstellation = null;
        if (this.viewport) this.viewport.style.cursor = '';
    }
}

export const Constellations = new ConstellationsEngine();
export default Constellations;
