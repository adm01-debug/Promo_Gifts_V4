/**
 * Integração LIVE — product-visual-search
 *
 * O contrato específico (incluindo entradas inválidas para a API Roboflow)
 * pertence ao registro central em descriptors.ts. Este shim mantém a cobertura
 * por função sem acoplar a suíte a um fixture legado inexistente.
 */
import { runLiveSuite } from './_live-suite';
import { descriptorFor } from './descriptors';

runLiveSuite(descriptorFor('product-visual-search'));
