/**
 * Integração LIVE — ema-pipeline-health.
 *
 * O descritor padrão valida CORS e a fronteira JWT/dev sem executar operações
 * mutantes. O caminho positivo é coberto por contrato hermético e só será
 * classificado como live-pass quando houver credencial dev de teste.
 */
import { runLiveSuite } from "./_live-suite";
import { descriptorFor } from "./descriptors";

runLiveSuite(descriptorFor("ema-pipeline-health"));
