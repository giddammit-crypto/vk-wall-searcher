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
    address: 'г. Владимир, Суздальский пр-т, д. 2',
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
    address: 'г. Владимир, Суздальский пр-т, д. 2',
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
    address: 'г. Владимир, Суздальский пр-т, д. 2',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-65-63'
  },
  'кх': {
    code: 'кх',
    branchNum: 'ЦГБ',
    branchName: 'Центральная городская библиотека, Книгохранилище',
    department: 'Книгохранилище',
    address: 'г. Владимир, Суздальский пр-т, д. 2',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-65-63'
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
    branchNum: 'Филиал №1',
    branchName: 'Библиотека — филиал №1',
    department: 'Взрослый абонемент',
    address: 'г. Владимир, ул. Горького, д. 69',
    district: 'Октябрьский',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 53-29-37'
  },
  'ф2': {
    code: 'ф2',
    aliases: ['ф2д'],
    branchNum: 'Филиал №2',
    branchName: 'Библиотека — филиал №2',
    department: 'Взрослый и детский абонементы',
    address: 'г. Владимир, проспект Ленина, д. 12',
    district: 'Ленинский',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 38-34-47, 32-15-84'
  },
  'ф3': {
    code: 'ф3',
    aliases: ['ф3сд'],
    branchNum: 'Филиал №3',
    branchName: 'Библиотека — филиал №3',
    department: 'Основной абонемент',
    address: 'г. Владимир, ул. Большая Нижегородская, д. 67а',
    district: 'Фрунзенский',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 32-36-74'
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
    address: 'г. Владимир, ул. Белоконской, д. 13а',
    district: 'Октябрьский',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 53-24-34'
  },
  'ф6': {
    code: 'ф6',
    branchNum: 'Филиал №6',
    branchName: 'Библиотека — филиал №6',
    department: 'Основной абонемент',
    address: 'г. Владимир, ул. Батурина, д. 28',
    district: 'Октябрьский',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 33-37-00'
  },
  'ф7': {
    code: 'ф7',
    aliases: ['ф7н', 'ф7нд'],
    branchNum: 'Филиал №7',
    branchName: 'Библиотека — филиал №7',
    department: 'Модельная библиотека',
    address: 'г. Владимир, ул. Фатьянова, д. 14',
    district: 'Юго-Западный',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 38-26-88'
  },
  'ф8': {
    code: 'ф8',
    aliases: ['ф8д'],
    branchNum: 'Филиал №8',
    branchName: 'Библиотека — филиал №8',
    department: 'Взрослый и детский абонементы',
    address: 'г. Владимир, ул. Соколова-Соколенка, д. 17в',
    district: 'Фрунзенский',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 21-68-27'
  },
  'ф9': {
    code: 'ф9',
    branchNum: 'Филиал №9',
    branchName: 'Библиотека — филиал №9',
    department: 'Проект «Добролит»',
    address: 'г. Владимир, Добросельский проезд, д. 2',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-58-15'
  },
  'ф10': {
    code: 'ф10',
    aliases: ['ф10д'],
    branchNum: 'Филиал №10',
    branchName: 'Библиотека — филиал №10',
    department: 'Детско-юношеский филиал',
    address: 'г. Владимир, ул. Горького, д. 69',
    district: 'Октябрьский',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 53-29-37'
  },
  'ф11': {
    code: 'ф11',
    aliases: ['ф11д'],
    branchNum: 'Филиал №11',
    branchName: 'Библиотека — филиал №11',
    department: 'Основной абонемент',
    address: 'г. Владимир, ул. Мира, д. 90',
    district: 'Октябрьский',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 53-39-80'
  },
  'ф12': {
    code: 'ф12',
    aliases: ['ф12д'],
    branchNum: 'Филиал №12',
    branchName: 'Библиотека — филиал №12',
    department: 'Взрослый и детский абонементы',
    address: 'г. Владимир, ул. Комиссарова, д. 28',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-63-93'
  },
  'ф13': {
    code: 'ф13',
    aliases: ['ф13н', 'ф13нд'],
    branchNum: 'Филиал №13',
    branchName: 'Библиотека — филиал №13',
    department: 'Модельная библиотека',
    address: 'г. Владимир, ул. Верхняя Дуброва, д. 26г',
    district: 'Юго-Западный',
    isDobroye: false,
    isCenter: false,
    phone: '8(4922) 38-30-26'
  },
  'ф14': {
    code: 'ф14',
    aliases: ['ф14н', 'ф14нд'],
    branchNum: 'Филиал №14',
    branchName: 'Библиотека — филиал №14',
    department: 'Модельная библиотека',
    address: 'г. Владимир, ул. Добросельская, д. 161',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-68-30'
  },
  'ф15': {
    code: 'ф15',
    aliases: ['ф15н', 'ф15нд'],
    branchNum: 'Филиал №15',
    branchName: 'Библиотека — филиал №15',
    department: 'Модельная библиотека',
    address: 'г. Владимир, ул. Юбилейная, д. 38',
    district: 'Доброе',
    isDobroye: true,
    isCenter: false,
    phone: '8(4922) 21-13-05'
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
