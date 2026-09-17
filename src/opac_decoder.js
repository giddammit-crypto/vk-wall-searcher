/**
 * OPAC-Global Data Decoder & Vladimir Branch Sigla Dictionary (ES6 / CommonJS)
 *
 * Designed for OPAC-Global (DB 62 - Vladimir CGB) integrations:
 *  - Decoding SHOTFORM XML responses
 *  - Decoding MoveCopies XML holdings and field899 subfields
 *  - Resolving branch sigla codes with strict district validation (Dobroye, Historic Center)
 */

export const VLADIMIR_BRANCH_SIGLAS = {
  'аб': {
    code: 'аб',
    branchNum: 'ЦГБ',
    branchName: 'Центральная городская библиотека, Абонемент',
    department: 'Абонемент',
    address: 'г. Владимир, Суздальский пр., д. 2',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-65-63, 21-66-80'
  },
  'чз': {
    code: 'чз',
    branchNum: 'ЦГБ',
    branchName: 'Центральная городская библиотека, Читальный зал',
    department: 'Читальный зал',
    address: 'г. Владимир, Суздальский пр., д. 2',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-65-63, 21-66-80'
  },
  'до': {
    code: 'до',
    branchNum: 'ЦГБ',
    branchName: 'Центральная городская библиотека, Детский отдел',
    department: 'Детский отдел',
    address: 'г. Владимир, Суздальский пр., д. 2',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-65-63, 21-66-80'
  },
  'кх': {
    code: 'кх',
    branchNum: 'ЦГБ',
    branchName: 'Центральная городская библиотека, Книгохранилище',
    department: 'Книгохранилище',
    address: 'г. Владимир, Суздальский пр., д. 2',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-65-63, 21-66-80'
  },
  'ибо': {
    code: 'ибо',
    branchNum: 'ЦГБ',
    branchName: 'Центральная городская библиотека, ИБО',
    department: 'Информационно-библиографический отдел',
    address: 'г. Владимир, Суздальский пр., д. 2',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-65-63, 21-66-80'
  },
  'ооо': {
    code: 'ооо',
    branchNum: 'ЦГБ',
    branchName: 'Центральная городская библиотека, Отдел обслуживания',
    department: 'Отдел обслуживания',
    address: 'г. Владимир, Суздальский пр., д. 2',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-65-63, 21-66-80'
  },
  'цдб': {
    code: 'цдб',
    aliases: ['цдч', 'цди', 'цки'],
    branchNum: 'ЦДБ',
    branchName: 'Центральная детская библиотека',
    department: 'Центральная детская библиотека',
    address: 'г. Владимир, ул. Большая Московская, д. 31',
    district: 'Исторический центр',
    isDobroye: false,
    isCenter: true,
    phone: '8(4922) 32-32-42, 32-47-73'
  },
  'ф1': {
    code: 'ф1',
    aliases: ['ф1д'],
    branchNum: 'Филиал №1',
    branchName: 'Библиотека — филиал №1',
    department: 'Взрослый и детский абонементы',
    address: 'г. Владимир, проспект Строителей, д. 38 а, кв. 44',
    district: 'Черёмушки / ВлГУ',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 33-86-23'
  },
  'ф2': {
    code: 'ф2',
    aliases: ['ф2д'],
    branchNum: 'Филиал №2',
    branchName: 'Библиотека — филиал №2',
    department: 'Взрослый и детский абонементы',
    address: 'г. Владимир, пр. Ленина, д. 12',
    district: 'Садовая площадь / «Заря»',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 32-15-84, 32-15-85'
  },
  'ф3': {
    code: 'ф3',
    aliases: ['ф3сд'],
    branchNum: 'Филиал №3',
    branchName: 'Библиотека — филиал №3',
    department: 'Основной абонемент',
    address: 'г. Владимир, мкр. Юрьевец, ул. Школьный проезд, д. 4',
    district: 'мкр. Юрьевец',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 26-18-74'
  },
  'ф4': {
    code: 'ф4',
    aliases: ['ф4д'],
    branchNum: 'Филиал №4',
    branchName: 'Библиотека — филиал №4',
    department: 'Взрослый и детский абонементы',
    address: 'г. Владимир, ул. Егорова, д. 10',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-96-11, 21-23-48',
    note: 'КРИТИЧЕСКИ ВАЖНО: именно жилой район «Доброе»!'
  },
  'ф5': {
    code: 'ф5',
    aliases: ['ф5д'],
    branchNum: 'Филиал №5',
    branchName: 'Библиотека — филиал №5',
    department: 'Взрослый и детский абонементы',
    address: 'г. Владимир, ул. Верхняя Дуброва, д. 10',
    district: 'ЮЗР / Верхняя Дуброва',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 54-28-43'
  },
  'ф6': {
    code: 'ф6',
    branchNum: 'Филиал №6',
    branchName: 'Библиотека — филиал №6',
    department: 'Основной абонемент',
    address: 'г. Владимир, мкр. Юрьевец, Институтский гор., д. 2',
    district: 'мкр. Юрьевец',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 45-37-01'
  },
  'ф7': {
    code: 'ф7',
    aliases: ['ф7н', 'ф7нд'],
    branchNum: 'Филиал №7',
    branchName: 'Библиотека — филиал №7',
    department: 'Основной абонемент',
    address: 'г. Владимир, ул. Мира, д. 55 (здание ДК Молодежи)',
    district: 'ДК Молодёжи / Северная',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 53-45-54'
  },
  'ф8': {
    code: 'ф8',
    aliases: ['ф8д'],
    branchNum: 'Филиал №8',
    branchName: 'Библиотека — филиал №8',
    department: 'Взрослый и детский абонементы',
    address: 'г. Владимир, ул. Сурикова, д. 26',
    district: 'ул. Сурикова / Чайковского',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 54-65-11'
  },
  'ф9': {
    code: 'ф9',
    aliases: ['добролит'],
    branchNum: 'Филиал №9',
    branchName: 'Библиотека — филиал №9',
    department: 'Литературно-краеведческий проект «Добролит»',
    address: 'г. Владимир, ул. Юбилейная, д. 38',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-22-75'
  },
  'ф10': {
    code: 'ф10',
    aliases: ['ф10д'],
    branchNum: 'Филиал №10',
    branchName: 'Библиотека — филиал №10',
    department: 'Основной абонемент',
    address: 'г. Владимир, ул. Диктора Левитана, д. 55',
    district: 'Диктора Левитана',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 21-65-63'
  },
  'ф11': {
    code: 'ф11',
    aliases: ['ф11д'],
    branchNum: 'Филиал №11',
    branchName: 'Библиотека — филиал №11',
    department: 'Основной абонемент',
    address: 'г. Владимир, мкр. Лесной, ул. Лесная, 10 А',
    district: 'мкр. Лесной',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 45-57-17'
  },
  'ф12': {
    code: 'ф12',
    aliases: ['ф12д'],
    branchNum: 'Филиал №12',
    branchName: 'Библиотека — филиал №12',
    department: 'Взрослый и детский абонементы',
    address: 'г. Владимир, мкр. Энергетик, ул. Энергетиков, д. 27, кв. 16',
    district: 'мкр. Энергетик',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 26-43-81'
  },
  'ф13': {
    code: 'ф13',
    aliases: ['ф13н', 'ф13нд', 'книголенд'],
    branchNum: 'Филиал №13',
    branchName: 'Библиотека — филиал №13',
    department: 'Библиотечный проект «Книголенд»',
    address: 'г. Владимир, ул. Горького, д. 69',
    district: 'ВлГУ / пл. Ленина',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 33-15-67'
  },
  'ф14': {
    code: 'ф14',
    aliases: ['ф14н', 'ф14нд'],
    branchNum: 'Филиал №14',
    branchName: 'Библиотека — филиал №14',
    department: 'Основной абонемент',
    address: 'г. Владимир, мкр. Оргтруд, ул. Октябрьская, д. 26 «б»',
    district: 'мкр. Оргтруд',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 45-74-69'
  },
  'ф15': {
    code: 'ф15',
    aliases: ['ф15н', 'ф15нд'],
    branchNum: 'Филиал №15',
    branchName: 'Библиотека — филиал №15',
    department: 'Основной абонемент',
    address: 'г. Владимир, пос. Заклязьменский, ул. Центральная, д. 11 А',
    district: 'пос. Заклязьменский',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 42-53-96'
  },
  'ф16': {
    code: 'ф16',
    aliases: ['ф16н', 'ф16нд'],
    branchNum: 'Филиал №16',
    branchName: 'Библиотека — филиал №16',
    department: 'Основной абонемент',
    address: 'г. Владимир, мкр. Коммунар, ул. Песочная, д. 15, кв. 21',
    district: 'мкр. Коммунар',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 42-53-95'
  }
};

/**
 * Нормализация кода сигла к канонической ветви
 * @param {string} rawSigla
 * @returns {object|null}
 */
export function resolveBranchBySigla(rawSigla) {
  if (!rawSigla || typeof rawSigla !== 'string') return null;
  let code = rawSigla.trim().toLowerCase();
  code = code.replace(/^(цгб[-_\s]+|мбук[-_\s]+)/gi, '');

  if (VLADIMIR_BRANCH_SIGLAS[code]) {
    return VLADIMIR_BRANCH_SIGLAS[code];
  }

  for (const [root, info] of Object.entries(VLADIMIR_BRANCH_SIGLAS)) {
    if (info.aliases && info.aliases.includes(code)) {
      return info;
    }
  }

  const match = code.match(/^(ф\d+)/i);
  if (match && VLADIMIR_BRANCH_SIGLAS[match[1]]) {
    return VLADIMIR_BRANCH_SIGLAS[match[1]];
  }

  return null;
}

/**
 * Декодирование текстовых блоков SHOTFORM (content/entry)
 * @param {string[]} entries
 * @returns {object}
 */
export function decodeShotformContent(entries) {
  const result = {
    author: '',
    title: '',
    subtitle: '',
    year: '',
    pagination: '',
    docType: '',
    bbk: '',
    authorSign: '',
    inventory: '',
    siglasRaw: '',
    branches: []
  };

  if (!entries || !entries.length) return result;

  // Entry 0: Библиографическая строка
  if (entries[0]) {
    const line = entries[0].trim();
    let rest = line;
    const authMatch = line.match(/^([^,]+),\s*(.+)$/);
    if (authMatch) {
      result.author = authMatch[1].trim();
      rest = authMatch[2];
    }

    const yearMatch = rest.match(/^(.*?)\s*-\s*(\d{4})\.\s*-\s*(.+)$/);
    let titleBlock = rest;
    if (yearMatch) {
      titleBlock = yearMatch[1].trim();
      result.year = yearMatch[2];
      result.pagination = yearMatch[3].trim();
    }

    if (titleBlock.includes(':')) {
      const parts = titleBlock.split(':');
      result.title = parts[0].trim();
      result.subtitle = parts.slice(1).join(':').trim();
    } else {
      result.title = titleBlock;
    }
  }

  // Entry 1: Тип документа
  if (entries[1]) {
    result.docType = entries[1].trim();
  }

  // Entry 2: Шифры и хранение
  if (entries[2]) {
    const meta = entries[2].trim();
    const shifrM = meta.match(/Шифр\s*([^;]+)/i);
    if (shifrM) result.bbk = shifrM[1].trim();

    const signM = meta.match(/Авт\.\s*знак\s*([^;]+)/i);
    if (signM) result.authorSign = signM[1].trim();

    const invM = meta.match(/Инв\.\s*номер\s*([^;]+)/i);
    if (invM) result.inventory = invM[1].trim();

    const sigM = meta.match(/Место\s*хранения:\s*([^;]+)/i);
    if (sigM) {
      result.siglasRaw = sigM[1].trim();
      const rawSiglas = result.siglasRaw.split(/[,\s]+/).filter(Boolean);
      const uniqueCodes = new Set();
      for (const s of rawSiglas) {
        const branch = resolveBranchBySigla(s);
        if (branch && !uniqueCodes.has(branch.code)) {
          uniqueCodes.add(branch.code);
          result.branches.push(branch);
        }
      }
    }
  }

  return result;
}
