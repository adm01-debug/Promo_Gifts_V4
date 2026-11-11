/**
 * Guarda do dry-run de migration: o draft roda dentro de `BEGIN; ... ROLLBACK;`.
 * Se o draft contiver qualquer comando que encerre ou reabra a transação
 * (COMMIT TRANSACTION, END, ROLLBACK, ABORT, START TRANSACTION, COMMIT AND CHAIN…)
 * ou um meta-comando do psql (\c, \!, \i…), o restante do script rodaria fora do
 * invólucro e o ROLLBACK final não protegeria o banco.
 *
 * Só `BEGIN;` e `COMMIT;` exatos são aceitos (o dry-run os neutraliza em SAVEPOINT).
 * Falha fechado: na dúvida, recusa.
 */

/** Remove comentários, strings, identificadores entre aspas e corpos `$tag$…$tag$`. */
export function maskSqlNoise(sql) {
  let out = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const next = sql[i + 1];
    if (c === '-' && next === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') { depth++; i += 2; }
        else if (sql[i] === '*' && sql[i + 1] === '/') { depth--; i += 2; }
        else i++;
      }
      out += ' ';
      continue;
    }
    if (c === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        i = end === -1 ? n : end + tag.length;
        out += "''";
        continue;
      }
    }
    if (c === "'" || c === '"') {
      // E'...' aceita \' ; strings comuns só aceitam '' como escape.
      const escapes = c === "'" && /[eE]$/.test(out) && !/[A-Za-z0-9_]$/.test(out.slice(0, -1));
      const quote = c;
      i++;
      while (i < n) {
        if (escapes && sql[i] === '\\') { i += 2; continue; }
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) { i += 2; continue; }
          break;
        }
        i++;
      }
      i++;
      out += quote === "'" ? "''" : '""';
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const CONTROL_RE =
  /^(commit|end|abort|rollback|start\s+transaction|begin\s+\S|prepare\s+transaction)/i;

/** @returns {string[]} descrições das violações (vazio = draft seguro para o dry-run). */
export function findTransactionControl(sql) {
  const masked = maskSqlNoise(sql);
  const problems = [];
  if (/^\s*\\/m.test(masked)) problems.push('meta-comando do psql (\\…)');
  for (const raw of masked.split(';')) {
    const stmt = raw.replace(/\s+/g, ' ').trim();
    if (!stmt) continue;
    if (/^(begin|commit)$/i.test(stmt)) continue;
    if (/^rollback\s+to\b/i.test(stmt)) continue;
    if (/^(savepoint|release)\b/i.test(stmt)) continue;
    if (CONTROL_RE.test(stmt)) problems.push(stmt.slice(0, 60));
  }
  return problems;
}
