// Executado por run-tests.py: imprime o mapa de transições do FE como JSON.
// Importa o arquivo de produção — nunca redigita os pares.
import { QUOTE_VALID_TRANSITIONS } from '../../../src/lib/quote-status-config.ts';

process.stdout.write(JSON.stringify(QUOTE_VALID_TRANSITIONS));
