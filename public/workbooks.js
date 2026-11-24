// Keep the Word template and borough appendix formats used by the project.
(() => {
  'use strict';
  let pack;
  let pending;
  function xmlEscape(s) {
    return String(s)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c],
      );
  }
  const encoder = new TextEncoder();
  const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(bytes) {
    let c = 0xffffffff;
    for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function bytes64(s) {
    const b = atob(s);
    return Uint8Array.from(b, (c) => c.charCodeAt(0));
  }
  function zipStore(entries) {
    const local = [],
      central = [];
    let offset = 0,
      centralSize = 0;
    const date = new Date(),
      dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
      dosDate =
        ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    for (const [filename, bytes] of entries) {
      const name = encoder.encode(filename),
        crc = crc32(bytes),
        h = new Uint8Array(30 + name.length),
        v = new DataView(h.buffer);
      v.setUint32(0, 0x04034b50, true);
      v.setUint16(4, 20, true);
      v.setUint16(6, 0x0800, true);
      v.setUint16(8, 0, true);
      v.setUint16(10, dosTime, true);
      v.setUint16(12, dosDate, true);
      v.setUint32(14, crc, true);
      v.setUint32(18, bytes.length, true);
      v.setUint32(22, bytes.length, true);
      v.setUint16(26, name.length, true);
      h.set(name, 30);
      local.push(h, bytes);
      const c = new Uint8Array(46 + name.length),
        cv = new DataView(c.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, bytes.length, true);
      cv.setUint32(24, bytes.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);
      c.set(name, 46);
      central.push(c);
      offset += h.length + bytes.length;
      centralSize += c.length;
    }
    const end = new Uint8Array(22),
      v = new DataView(end.buffer);
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, entries.length, true);
    v.setUint16(10, entries.length, true);
    v.setUint32(12, centralSize, true);
    v.setUint32(16, offset, true);
    return new Blob([...local, ...central, end], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }

  function createDocument(key, vars) {
    if (!pack.templates[key]) throw new Error('This pack is not available.');
    const all = { ...pack.common, ...pack.templates[key] },
      entries = [];
    for (const [name, item] of Object.entries(all)) {
      let b;
      if (item.text !== undefined) {
        const text = item.text
          .replace(/\{\{(ROLE|AREA|TEAM|MONTH)\}\}/g, (_, key) => xmlEscape(vars[key]))
          .replace('{{CRISIS_ROUTES_XML}}', () => window.DTPCrisis.wordXml(vars.AREA_ID));
        b = encoder.encode(text);
      } else b = bytes64(item.base64);
      entries.push([name, b]);
    }
    return zipStore(entries);
  }

  async function prepare(key, values) {
    if (!pack) {
      if (!pending)
        pending = fetch('assets/word-packs.json', { credentials: 'same-origin' })
          .then((response) => {
            if (!response.ok) throw new Error('Download unavailable');
            return response.json();
          })
          .then((value) => {
            if (!value.common || !value.templates) throw new Error('Incomplete form');
            pack = value;
          })
          .finally(() => {
            pending = null;
          });
      await pending;
    }
    return createDocument(key, values);
  }
  window.DischargeForms = { prepare };
})();
