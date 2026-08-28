/**
 * Integração LIVE — intelligence-substitute-applied.
 *
 * A função é mutante e exige JWT. Este shim cobre somente CORS, fronteira de
 * autenticação e inputs inválidos pelo descritor padrão; não dispara o insert
 * positivo em ai_usage_events.
 */
import { runLiveSuite } from "./_live-suite";
import { descriptorFor } from "./descriptors";

runLiveSuite(descriptorFor("intelligence-substitute-applied"));
